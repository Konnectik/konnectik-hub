import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const GPS_GRACE_METERS = 50;
const GPS_GRACE_FACTOR = 1.3;

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

    const { plan_id, idempotency_key, ap_id, user_lat, user_lng, gps_accuracy_m } = await req.json();

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

    // Early proximity gate when an ap_id is provided. This blocks accidental
    // purchases by far-away users; the real enforcement happens in start-segment.
    if (ap_id && typeof user_lat === 'number' && typeof user_lng === 'number') {
      const { data: ap } = await adminClient
        .from('access_points')
        .select('id, zone_label, latitude, longitude, propagation_radius_m')
        .eq('id', ap_id)
        .maybeSingle();
      if (ap && typeof ap.latitude === 'number' && typeof ap.longitude === 'number' && ap.propagation_radius_m) {
        const distance = haversineMeters(user_lat, user_lng, ap.latitude, ap.longitude);
        const maxAllowed = ap.propagation_radius_m * GPS_GRACE_FACTOR + GPS_GRACE_METERS + (typeof gps_accuracy_m === 'number' ? gps_accuracy_m : 0);
        if (distance > maxAllowed) {
          return new Response(JSON.stringify({
            error: `Vous êtes trop loin de ${ap.zone_label} pour acheter ce forfait.`,
            code: 'OUT_OF_RANGE',
            distance_m: Math.round(distance),
            max_allowed_m: Math.round(maxAllowed),
          }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

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

<<<<<<< HEAD
    const price = plan.price ?? 0;
=======
    const price = plan.price_xaf ?? 0;
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25

    if ((profile.wallet_balance_xaf ?? 0) < price) {
      return new Response(JSON.stringify({ error: 'Insufficient wallet balance' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

<<<<<<< HEAD
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

=======
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25
    // Debit wallet
    const newBalance = (profile.wallet_balance_xaf ?? 0) - price;
    await adminClient
      .from('profiles')
      .update({ wallet_balance_xaf: newBalance })
      .eq('id', user.id);

    // Create wallet transaction (debit)
<<<<<<< HEAD
    const reference = `BUY${Date.now()}${crypto.randomUUID().slice(0, 8).replace(/-/g, '')}`;
=======
    const reference = `BUY-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25
    await adminClient.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'debit',
      amount_xaf: price,
      fee_xaf: 0,
      net_xaf: price,
      reference,
      status: 'confirmed',
    });

<<<<<<< HEAD
    // Calculate expiry — 30 days from purchase by default
    const expiresAt = new Date(Date.now() + DEFAULT_BUNDLE_TTL_DAYS * 86400000).toISOString();
=======
    // Calculate expiry based on plan duration
    const expiresAt = plan.duration_days
      ? new Date(Date.now() + plan.duration_days * 86400000).toISOString()
      : null;
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25

    // Create user bundle
    const { data: bundle, error: bundleError } = await adminClient
      .from('user_bundles')
      .insert({
        user_id: user.id,
        plan_id,
        session_type: plan.session_type ?? 'paid',
<<<<<<< HEAD
        total_minutes: totalMinutes,
=======
        total_minutes: plan.duration_minutes ?? 0,
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25
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
