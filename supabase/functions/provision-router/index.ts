import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function buildCommand(privateKey: string, vpsPublicKey: string, assignedIp: string) {
  return `/interface wireguard add \\
  name="konnectik-vpn" \\
  private-key="${privateKey}"

/interface wireguard peers add \\
  interface="konnectik-vpn" \\
  public-key="${vpsPublicKey}" \\
  endpoint-address="relay.konnectik.cm" \\
  endpoint-port=51820 \\
  allowed-address=10.0.0.1/32 \\
  persistent-keepalive=25s

/ip address add \\
  address="${assignedIp}/24" \\
  interface="konnectik-vpn"

/ip service set www \\
  disabled=no port=80 \\
  address=10.0.0.0/24`;
}

async function callRelay(path: string, payload: Record<string, unknown>) {
  const url = Deno.env.get('MIKROTIK_RELAY_URL');
  const apiKey = Deno.env.get('MIKROTIK_RELAY_API_KEY');
  if (!url || !apiKey) throw new Error('Mikrotik relay not configured');
  const res = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Relay ${res.status}: ${await res.text()}`);
  return res.json();
}

function nextAvailableIp(taken: Set<string>): string | null {
  for (let i = 2; i <= 254; i++) {
    const ip = `10.0.0.${i}`;
    if (!taken.has(ip)) return ip;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(401, { error: 'Missing authorization' });

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json(401, { error: 'Unauthorized' });

    const body = await req.json().catch(() => ({}));
    const apId = body?.ap_id;
    if (!apId || typeof apId !== 'string') {
      return json(400, { error: 'ap_id is required' });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Authorization: caller must own the AP's provider OR be admin
    const { data: ap, error: apErr } = await admin
      .from('access_points')
      .select('id, provider_id, tunnel_ip, wg_public_key, wg_private_key_encrypted, providers(user_id)')
      .eq('id', apId)
      .single();
    if (apErr || !ap) return json(404, { error: 'Access point not found' });

    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    const ownerUserId = (ap as any).providers?.user_id;
    if (!isAdmin && ownerUserId !== user.id) {
      return json(403, { error: 'Forbidden' });
    }

    const vpsPublicKey = Deno.env.get('VPS_WG_PUBLIC_KEY');
    if (!vpsPublicKey) return json(500, { error: 'VPS_WG_PUBLIC_KEY not configured' });

    // Idempotency: if already provisioned, just return the command
    if (ap.tunnel_ip && ap.wg_private_key_encrypted) {
      return json(200, {
        tunnel_ip: ap.tunnel_ip,
        command: buildCommand(ap.wg_private_key_encrypted, vpsPublicKey, ap.tunnel_ip),
      });
    }

    // Step 1: pick next available IP
    const { data: taken, error: takenErr } = await admin
      .from('tunnel_ip_assignments')
      .select('ip');
    if (takenErr) throw takenErr;
    const assignedIp = nextAvailableIp(new Set((taken || []).map((r: { ip: string }) => r.ip)));
    if (!assignedIp) return json(409, { error: 'No tunnel IPs available' });

    // Step 2: generate keypair on VPS
    const kp = await callRelay('/internal/generate-keypair', {});
    const publicKey = kp?.public_key;
    const privateKey = kp?.private_key;
    if (!publicKey || !privateKey) throw new Error('Relay returned invalid keypair');

    // Step 3: reserve the IP
    const { error: insErr } = await admin
      .from('tunnel_ip_assignments')
      .insert({ ip: assignedIp, ap_id: apId });
    if (insErr) throw insErr;

    // Step 4: persist on access point
    const { error: updErr } = await admin
      .from('access_points')
      .update({
        wg_public_key: publicKey,
        wg_private_key_encrypted: privateKey,
        tunnel_ip: assignedIp,
        tunnel_status: 'pending',
      })
      .eq('id', apId);
    if (updErr) throw updErr;

    // Step 5: register peer with VPS
    await callRelay('/internal/add-peer', {
      public_key: publicKey,
      assigned_ip: assignedIp,
    });

    // Step 6: build & return command
    return json(200, {
      tunnel_ip: assignedIp,
      command: buildCommand(privateKey, vpsPublicKey, assignedIp),
    });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});
