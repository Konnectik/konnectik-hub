import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_FEE_RATE = 0.20; // 20% platform fee

function formatTimeLimit(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

async function callMikrotikRelay(action: string, payload: Record<string, unknown>) {
  const url = Deno.env.get('MIKROTIK_RELAY_URL');
  const apiKey = Deno.env.get('MIKROTIK_RELAY_API_KEY');
  if (!url || !apiKey) throw new Error('Mikrotik relay not configured');
  const res = await fetch(`${url}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Relay ${res.status}: ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { segment_id } = await req.json();

    if (!segment_id || typeof segment_id !== 'string') {
      return new Response(JSON.stringify({ error: 'segment_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Fetch the active segment (include mikrotik_user_name)
    const { data: segment, error: segError } = await adminClient
      .from('session_segments')
      .select('id, bundle_id, ap_id, user_id, started_at, scheduled_end, status, time_used_minutes, mikrotik_user_name')
      .eq('id', segment_id)
      .eq('user_id', user.id)
      .single();

    if (segError || !segment) {
      return new Response(JSON.stringify({ error: 'Segment not found or does not belong to user' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (segment.status !== 'active') {
      return new Response(JSON.stringify({ error: `Segment is already ${segment.status}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Compute time used
    const now = new Date();
    const startedAt = new Date(segment.started_at);
    const timeUsedMs = now.getTime() - startedAt.getTime();
    const timeUsedMinutes = Math.max(0, Math.round(timeUsedMs / 60000));

    // 3. End the segment
    const { error: updateError } = await adminClient
      .from('session_segments')
      .update({
        status: 'ended',
        ended_at: now.toISOString(),
        time_used_minutes: timeUsedMinutes,
      })
      .eq('id', segment_id);

    if (updateError) throw updateError;

    // 4. Revoke user on Mikrotik router via VPS relay (soft fail)
    if (segment.ap_id && segment.mikrotik_user_name) {
      try {
        // Fetch AP router_ip
        const { data: apData } = await adminClient
          .from('access_points')
          .select('router_ip')
          .eq('id', segment.ap_id)
          .single();

        if (apData?.router_ip) {
          await callMikrotikRelay('hotspot/remove-user', {
            router_ip: apData.router_ip,
            username: segment.mikrotik_user_name,
          });
        }
      } catch (relayErr) {
        // Soft fail: log but don't block — router session will timeout naturally
        console.error(`[end-segment] Relay revoke failed for segment ${segment.id}:`, (relayErr as Error).message);
      }
    }

    // 5. Check if bundle is exhausted
    const { data: allSegments } = await adminClient
      .from('session_segments')
      .select('time_used_minutes')
      .eq('bundle_id', segment.bundle_id);

    const totalUsed = (allSegments || []).reduce(
      (sum: number, s: { time_used_minutes: number }) => sum + (s.time_used_minutes || 0), 0
    );

    const { data: bundle } = await adminClient
      .from('user_bundles')
      .select('total_minutes, plan_id')
      .eq('id', segment.bundle_id)
      .single();

    const remainingMinutes = (bundle?.total_minutes || 0) - totalUsed;

    if (remainingMinutes <= 0 && bundle) {
      await adminClient
        .from('user_bundles')
        .update({ status: 'exhausted' })
        .eq('id', segment.bundle_id);
    }

    // 6. Provider revenue allocation (if AP is linked to a provider)
    let earningsRecord = null;
    if (segment.ap_id && bundle?.plan_id) {
      // Fetch AP → provider
      const { data: ap } = await adminClient
        .from('access_points')
        .select('provider_id')
        .eq('id', segment.ap_id)
        .single();

      // Fetch plan price
      const { data: plan } = await adminClient
        .from('bundles')
        .select('price')
        .eq('id', bundle.plan_id)
        .single();

      if (ap?.provider_id && plan) {
        const planPrice = plan.price ?? 0;
        const totalMinutes = bundle.total_minutes || 1;
        const timeRatio = timeUsedMinutes / totalMinutes;
        const grossXaf = Math.round(planPrice * timeRatio);
        const platformFee = Math.round(grossXaf * PLATFORM_FEE_RATE);
        const netXaf = grossXaf - platformFee;

        // Insert earnings record
        const { data: earnings } = await adminClient
          .from('provider_earnings_ledger')
          .insert({
            segment_id: segment.id,
            bundle_id: segment.bundle_id,
            ap_id: segment.ap_id,
            provider_id: ap.provider_id,
            time_used_minutes: timeUsedMinutes,
            plan_price_xaf: planPrice,
            time_ratio: timeRatio,
            gross_xaf: grossXaf,
            platform_fee_xaf: platformFee,
            net_xaf: netXaf,
            allocated_at: now.toISOString(),
          })
          .select('id, net_xaf')
          .single();

        earningsRecord = earnings;

        // Credit provider wallet
        if (earnings) {
          const { data: wallet } = await adminClient
            .from('provider_wallets')
            .select('balance_xaf')
            .eq('provider_id', ap.provider_id)
            .maybeSingle();

          if (wallet) {
            await adminClient
              .from('provider_wallets')
              .update({ balance_xaf: (wallet.balance_xaf || 0) + netXaf })
              .eq('provider_id', ap.provider_id);
          } else {
            await adminClient
              .from('provider_wallets')
              .insert({ provider_id: ap.provider_id, balance_xaf: netXaf });
          }
        }
      }
    }

    return new Response(JSON.stringify({
      segment_id: segment.id,
      time_used_minutes: timeUsedMinutes,
      remaining_minutes: Math.max(0, remainingMinutes),
      bundle_status: remainingMinutes <= 0 ? 'exhausted' : 'active',
      provider_earnings: earningsRecord ? { id: earningsRecord.id, net_xaf: earningsRecord.net_xaf } : null,
      message: 'Session ended successfully',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
