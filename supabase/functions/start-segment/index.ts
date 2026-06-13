import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatTimeLimit(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

// Haversine — distance in meters between two lat/lng points.
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Grace factor accounts for GPS accuracy & propagation overshoot at signal edge.
const GPS_GRACE_METERS = 50;
const GPS_GRACE_FACTOR = 1.3;

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

    const { bundle_id, ap_id, mac_address, ios_token, user_lat, user_lng, gps_accuracy_m } = await req.json();

    if (!bundle_id || typeof bundle_id !== 'string') {
      return new Response(JSON.stringify({ error: 'bundle_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ap_id || typeof ap_id !== 'string') {
      return new Response(JSON.stringify({ error: 'ap_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof user_lat !== 'number' || typeof user_lng !== 'number') {
      return new Response(JSON.stringify({
        error: 'Location required. Enable GPS to start a session.',
        code: 'LOCATION_REQUIRED',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 0. Verify the user is physically within the AP's propagation range.
    // This is the primary anti-abuse gate before consuming any bundle minutes.
    const { data: ap, error: apError } = await adminClient
      .from('access_points')
      .select('id, zone_label, latitude, longitude, propagation_radius_m, status')
      .eq('id', ap_id)
      .single();

    if (apError || !ap) {
      return new Response(JSON.stringify({ error: 'Access point not found', code: 'AP_NOT_FOUND' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (ap.status !== 'online') {
      return new Response(JSON.stringify({
        error: `Access point is ${ap.status}, cannot start session here.`,
        code: 'AP_NOT_ONLINE',
        ap_status: ap.status,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof ap.latitude === 'number' && typeof ap.longitude === 'number' && ap.propagation_radius_m) {
      const distance = haversineMeters(user_lat, user_lng, ap.latitude, ap.longitude);
      const maxAllowed = ap.propagation_radius_m * GPS_GRACE_FACTOR + GPS_GRACE_METERS + (typeof gps_accuracy_m === 'number' ? gps_accuracy_m : 0);
      console.log('[start-segment] proximity check', {
        userId: user.id, ap_id, distance_m: Math.round(distance),
        radius_m: ap.propagation_radius_m, max_allowed_m: Math.round(maxAllowed),
        gps_accuracy_m: gps_accuracy_m ?? null,
      });
      if (distance > maxAllowed) {
        return new Response(JSON.stringify({
          error: `Vous êtes trop loin de ${ap.zone_label}. Rapprochez-vous du point d'accès.`,
          code: 'OUT_OF_RANGE',
          distance_m: Math.round(distance),
          max_allowed_m: Math.round(maxAllowed),
        }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.warn('[start-segment] AP has no coordinates or radius — proximity check skipped', { ap_id });
    }

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
    let apRouterIp: string | null = null;
    if (ap_id) {
      const { data: ap, error: apError } = await adminClient
        .from('access_points')
        .select('id, status, router_ip')
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

      apRouterIp = ap.router_ip || null;
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

    // 7. Authorize user on Mikrotik router via VPS relay
    if (ap_id && apRouterIp) {
      try {
        await callMikrotikRelay('hotspot/add-user', {
          router_ip: apRouterIp,
          username: mikrotikUserName,
          time_limit: formatTimeLimit(remainingMinutes),
          mac_address: mac_address || null,
        });
      } catch (relayErr) {
        // Hard fail: mark segment as failed, return error
        await adminClient
          .from('session_segments')
<<<<<<< HEAD
          .update({ status: 'error', ended_at: new Date().toISOString() })
=======
          .update({ status: 'failed', ended_at: new Date().toISOString() })
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25
          .eq('id', segment.id);

        return new Response(JSON.stringify({
          error: 'Failed to authorize on router',
          detail: (relayErr as Error).message,
          segment_id: segment.id,
        }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
