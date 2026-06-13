import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function mapStatus(s: string): 'completed' | 'failed' | 'processing' {
  const v = (s || '').toUpperCase();
  if (v === 'SUCCESS') return 'completed';
  if (v === 'PENDING' || v === 'PROCESSING') return 'processing';
  return 'failed'; // FAILED | CANCELLED | TIMEOUT | anything else
}

async function verifyCallbackToken(token: string, orderId: string): Promise<boolean> {
  const secondaryKey = Deno.env.get('NETWALLET_SECONDARY_KEY')!;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${orderId}_${secondaryKey}`));
  const expected = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return token === expected;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { Status, TransactionId } = body;

    if (!TransactionId) {
      return new Response(JSON.stringify({ error: 'TransactionId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: payout } = await adminClient
      .from('payout_requests')
      .select('id, provider_id, amount_xaf, status, reference')
      .eq('aggregator_ref', TransactionId)
      .maybeSingle();

    if (!payout) {
      console.log('[payout-webhook] not found', { TransactionId });
      return new Response(JSON.stringify({ error: 'Payout not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional integrity check via X-CallbackToken
    const callbackToken = req.headers.get('X-CallbackToken');
    if (callbackToken) {
      const valid = await verifyCallbackToken(callbackToken, payout.reference);
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid callback token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const newStatus = mapStatus(Status);

    // Idempotent: only act if we are transitioning *out* of processing/pending.
    if (payout.status === 'completed' || payout.status === 'failed' || payout.status === 'cancelled') {
      console.log('[payout-webhook] already finalized, ignoring', { payoutId: payout.id, status: payout.status });
      return new Response(JSON.stringify({ received: true, idempotent: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (newStatus === 'completed') {
      await adminClient.from('payout_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', payout.id);
      console.log('[payout-webhook] completed', { payoutId: payout.id, providerId: payout.provider_id, amount: payout.amount_xaf });
      return new Response(JSON.stringify({ received: true, status: 'completed' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (newStatus === 'failed') {
      // Refund the provider wallet on failure.
      const { data: w } = await adminClient
        .from('provider_wallets')
        .select('balance_xaf')
        .eq('provider_id', payout.provider_id)
        .maybeSingle();
      const current = w?.balance_xaf ?? 0;
      await adminClient.from('provider_wallets')
        .update({ balance_xaf: current + payout.amount_xaf })
        .eq('provider_id', payout.provider_id);
      await adminClient.from('payout_requests')
        .update({ status: 'failed', error_message: Status, completed_at: new Date().toISOString() })
        .eq('id', payout.id);
      console.log('[payout-webhook] failed, refunded', { payoutId: payout.id, refunded: payout.amount_xaf });
      return new Response(JSON.stringify({ received: true, status: 'failed', refunded: payout.amount_xaf }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // newStatus === 'processing' — keep waiting
    return new Response(JSON.stringify({ received: true, status: 'processing' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
