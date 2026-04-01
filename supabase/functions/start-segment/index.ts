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

    const { bundle_id, ap_id, mac_address, ios_token } = await req.json();

    if (!bundle_id || typeof bundle_id !== 'string') {
      return new Response(JSON.stringify({ error: 'bundle_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Validate the bundle belongs to the user and is active
    const { data: bundle, error: bundleError } = await adminClient
      .from('user_bundles')
      .select('id, user_id, plan_id, total_minutes, status, expires_at')
      .eq('id', bundle_id)
      .eq('user_id', user.id)
      .single();

    if (bundleError || !bundle) {
      return new Response(JSON.stringify({ error: 'Bundle not found or does not belong to user' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (bundle.status !== 'active') {
      return new Response(JSON.stringify({ error: `Bundle is ${bundle.status}, cannot start session` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (bundle.expires_at && new Date(bundle.expires_at) < new Date()) {
      await adminClient
        .from('user_bundles')
        .update({ status: 'expired' })
        .eq('id', bundle_id);
      return new Response(JSON.stringify({ error: 'Bundle has expired' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Check for existing active segment on this bundle
    const { data: activeSegment } = await adminClient
      .from('session_segments')
      .select('id')
      .eq('bundle_id', bundle_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (activeSegment) {
      return new Response(JSON.stringify({ error: 'An active session already exists for this bundle', segment_id: activeSegment.id }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Compute remaining minutes (total_minutes minus all used minutes)
    const { data: usedRows } = await adminClient
      .from('session_segments')
      .select('time_used_minutes')
      .eq('bundle_id', bundle_id);

    const usedMinutes = (usedRows || []).reduce((sum: number, r: { time_used_minutes: number }) => sum + (r.time_used_minutes || 0), 0);
    const remainingMinutes = bundle.total_minutes - usedMinutes;

    if (remainingMinutes <= 0) {
      await adminClient
        .from('user_bundles')
        .update({ status: 'exhausted' })
        .eq('id', bundle_id);
      return new Response(JSON.stringify({ error: 'No remaining minutes on this bundle' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Validate access point if provided
    if (ap_id) {
      const { data: ap, error: apError } = await adminClient
        .from('access_points')
        .select('id, status')
        .eq('id', ap_id)
        .single();

      if (apError || !ap) {
        return new Response(JSON.stringify({ error: 'Access point not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (ap.status !== 'online') {
        return new Response(JSON.stringify({ error: `Access point is ${ap.status}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 5. Compute scheduled end
    const now = new Date();
    const scheduledEnd = new Date(now.getTime() + remainingMinutes * 60000);

    // Generate a Mikrotik username for this session
    const mikrotikUserName = `k-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;

    // 6. Create segment
    const { data: segment, error: segmentError } = await adminClient
      .from('session_segments')
      .insert({
        bundle_id,
        ap_id: ap_id || null,
        user_id: user.id,
        mac_address: mac_address || null,
        ios_token: ios_token || null,
        status: 'active',
        started_at: now.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        ended_at: null,
        time_used_minutes: 0,
        mikrotik_user_name: mikrotikUserName,
      })
      .select('id, started_at, scheduled_end, mikrotik_user_name')
      .single();

    if (segmentError) {
      throw segmentError;
    }

    // TODO: Call Mikrotik API to authorize the user on the router
    // This would involve:
    // 1. Fetching the access point's router_ip, router_user, router_pass
    // 2. Making an API call to the Mikrotik RouterOS to add a hotspot user
    // 3. Setting the time limit based on remainingMinutes
    // For now, we skip this and assume authorization is handled externally

    return new Response(JSON.stringify({
      segment_id: segment.id,
      started_at: segment.started_at,
      scheduled_end: segment.scheduled_end,
      remaining_minutes: remainingMinutes,
      mikrotik_user_name: segment.mikrotik_user_name,
      message: 'Session started successfully',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
