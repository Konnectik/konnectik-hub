

## Update start-segment & end-segment with Mikrotik Relay Integration

### Summary
Add `callMikrotikRelay` helper and `formatTimeLimit` utility to both edge functions, replacing the TODO placeholders with actual relay calls. Credentials stay on the VPS — edge functions only send `router_ip`.

### Changes

**1. `supabase/functions/start-segment/index.ts`**

- Add `formatTimeLimit(minutes)` → `"HH:MM:SS"` helper
- Add `callMikrotikRelay(action, payload)` helper using `MIKROTIK_RELAY_URL` and `MIKROTIK_RELAY_API_KEY` from `Deno.env`
- Expand AP select (line ~109) to include `router_ip` alongside `id, status`
- After segment creation (replacing TODO at lines ~163-168):
  - If `ap_id` exists, call relay `POST /hotspot/add-user` with `{ router_ip, username: mikrotikUserName, time_limit: formatTimeLimit(remainingMinutes), mac_address }`
  - On failure: update segment to `status: 'failed'`, return 502 error (hard fail)

**2. `supabase/functions/end-segment/index.ts`**

- Add same two helpers
- Expand segment select to also fetch `mikrotik_user_name`
- After AP select for earnings (reuse `ap` data), extract `router_ip`
- After segment is marked `ended` (after line ~85):
  - If `ap_id` exists, call relay `POST /hotspot/remove-user` with `{ router_ip, username: mikrotik_user_name }`
  - On failure: `console.error` only — soft fail, don't block response

**3. Supabase secrets (2 new)**

- `MIKROTIK_RELAY_URL` — VPS endpoint (e.g. `https://relay.konnectik.cm:8443`)
- `MIKROTIK_RELAY_API_KEY` — shared API key

### Shared helper code (added to both files)

```typescript
function formatTimeLimit(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
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
```

### Failure behavior

| Function | On relay error | Rationale |
|----------|---------------|-----------|
| start-segment | Hard fail — mark segment `failed`, return 502 | User must not get "connected" if router didn't authorize |
| end-segment | Soft fail — log error, continue response | Session is already ended in DB; router session will timeout naturally |

