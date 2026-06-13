// Send Web Push notifications to all device_tokens of a user.
// Triggered either directly by other edge functions OR by a Supabase Database
// Webhook listening to INSERTs on `public.notifications`.
//
// Setup checklist:
//   1. Generate VAPID keys (one-time): `npx web-push generate-vapid-keys`
//   2. supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:ops@konnectik.cm
//   3. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY on Netlify so the PWA can subscribe.
//   4. Configure a Database Webhook in Supabase Dashboard:
//        - Table: public.notifications
//        - Events: INSERT
//        - Type: HTTP Request → POST /functions/v1/send-push
//        - Body: { record } (Supabase ships {type, record, table} by default)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:ops@konnectik.cm';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured — push delivery disabled' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json();
    // Supabase Database Webhook sends { type, table, record, schema, ... }.
    // Direct callers can send { user_id, title, body, url, tag }.
    const record = payload.record ?? payload;
    const userId: string = record.user_id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = JSON.stringify({
      title: record.title || 'Konnectik',
      body: record.body || '',
      url: record.data?.url || '/',
      tag: record.category || 'system',
    });

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tokens } = await adminClient
      .from('device_tokens')
      .select('id, token, platform')
      .eq('user_id', userId);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ delivered: 0, message: 'No device tokens for user' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let delivered = 0, dropped = 0;
    for (const t of tokens) {
      try {
        if (t.platform === 'web') {
          const sub = JSON.parse(t.token);
          await webpush.sendNotification(sub, message);
          delivered++;
        }
        // iOS/Android native tokens would use FCM/APNS here — not implemented yet.
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410 = subscription gone; remove it.
        if (statusCode === 404 || statusCode === 410) {
          await adminClient.from('device_tokens').delete().eq('id', t.id);
          dropped++;
        } else {
          console.error('[send-push] send failed', (err as Error).message);
        }
      }
    }

    return new Response(JSON.stringify({ delivered, dropped, total: tokens.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
