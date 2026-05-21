import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { plan_id, idempotency_key } = await req.json();

    if (!plan_id || typeof plan_id !== 'string') {
      return new Response(JSON.stringify({ error: 'plan_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for admin operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Idempotency check
    if (idempotency_key) {
      const { data: existing } = await adminClient
        .from('user_bundles')
        .select('id')
        .eq('idempotency_key', idempotency_key)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ bundle_id: existing.id, message: 'Already purchased' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch the plan
    const { data: plan, error: planError } = await adminClient
      .from('bundles')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile for wallet balance
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('wallet_balance_xaf')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const price = plan.price ?? 0;

    if ((profile.wallet_balance_xaf ?? 0) < price) {
      return new Response(JSON.stringify({ error: 'Insufficient wallet balance' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert plan duration (duration + duration_unit) → minutes + expiry
    function planTotalMinutes(p: { duration: number; duration_unit: string | null }): number {
      const unit = (p.duration_unit || 'minutes').toLowerCase();
      switch (unit) {
        case 'minute':
        case 'minutes':
        case 'min': return p.duration;
        case 'hour':
        case 'hours':
        case 'h': return p.duration * 60;
        case 'day':
        case 'days':
        case 'd': return p.duration * 60 * 24;
        case 'week':
        case 'weeks': return p.duration * 60 * 24 * 7;
        case 'month':
        case 'months': return p.duration * 60 * 24 * 30;
        default: return p.duration;
      }
    }
    const totalMinutes = planTotalMinutes(plan);
    // Bundles expire 30 days after purchase by default (configurable later).
    const DEFAULT_BUNDLE_TTL_DAYS = 30;

    // Debit wallet
    const newBalance = (profile.wallet_balance_xaf ?? 0) - price;
    await adminClient
      .from('profiles')
      .update({ wallet_balance_xaf: newBalance })
      .eq('id', user.id);

    // Create wallet transaction (debit)
    const reference = `BUY${Date.now()}${crypto.randomUUID().slice(0, 8).replace(/-/g, '')}`;
    await adminClient.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'debit',
      amount_xaf: price,
      fee_xaf: 0,
      net_xaf: price,
      reference,
      status: 'confirmed',
    });

    // Calculate expiry — 30 days from purchase by default
    const expiresAt = new Date(Date.now() + DEFAULT_BUNDLE_TTL_DAYS * 86400000).toISOString();

    // Create user bundle
    const { data: bundle, error: bundleError } = await adminClient
      .from('user_bundles')
      .insert({
        user_id: user.id,
        plan_id,
        session_type: plan.session_type ?? 'paid',
        total_minutes: totalMinutes,
        status: 'active',
        expires_at: expiresAt,
        idempotency_key: idempotency_key || null,
      })
      .select('id')
      .single();

    if (bundleError) {
      // Rollback wallet on failure
      await adminClient
        .from('profiles')
        .update({ wallet_balance_xaf: profile.wallet_balance_xaf })
        .eq('id', user.id);
      throw bundleError;
    }

    return new Response(JSON.stringify({
      bundle_id: bundle.id,
      new_balance_xaf: newBalance,
      message: 'Bundle purchased successfully',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
