## Provider Self-Registration for Access Points (Case B)

End goal: when a K-Owner edits a freshly created access point, Step 2 of the wizard auto-provisions a WireGuard tunnel (IP + keypair via the VPS relay), shows a copy-paste Mikrotik command, and live-updates the connection status — no manual WireGuard IP entry.

### 1. Database migration (new SQL file `src/sql/phase10-tunnel-provisioning.sql` + applied via migration)

- `ALTER TABLE access_points ADD COLUMN`:
  - `wg_public_key TEXT`
  - `wg_private_key_encrypted TEXT`
  - `tunnel_ip TEXT`
  - `tunnel_status TEXT NOT NULL DEFAULT 'pending' CHECK (tunnel_status IN ('pending','connected','disconnected'))`
  - `tunnel_last_seen TIMESTAMPTZ`
- New table `tunnel_ip_assignments (ip TEXT PK, ap_id UUID REFERENCES access_points(id), assigned_at TIMESTAMPTZ DEFAULT now())`
- Seed reserved row: `('10.0.0.1', NULL)` (VPS server IP)
- Enable RLS on `tunnel_ip_assignments`. Single policy for `service_role` only (`USING (auth.role() = 'service_role')` for ALL); no policies granted to `authenticated`/`anon`, so they cannot read or write.
- Enable Realtime on `access_points` (REPLICA IDENTITY FULL + add to `supabase_realtime` publication if not already) so the Step 2 status indicator works.

### 2. New Edge Function `supabase/functions/provision-router/index.ts`

Standard Lovable edge function scaffold (CORS, OPTIONS handler, JWT-authenticated caller, then service-role client for DB writes). Validate body with Zod: `{ ap_id: string().uuid() }`.

Steps in order:
1. Load env: `MIKROTIK_RELAY_URL`, `MIKROTIK_RELAY_API_KEY`, `VPS_WG_PUBLIC_KEY`, plus `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.
2. Idempotency: if the AP already has `tunnel_ip` + `wg_private_key_encrypted`, skip allocation/keygen and just rebuild the command string from existing values.
3. Otherwise:
   - Select all `ip` from `tunnel_ip_assignments`; iterate `10.0.0.2 → 10.0.0.254`, pick lowest unassigned. Error 409 if exhausted.
   - `POST {RELAY_URL}/internal/generate-keypair` with `X-API-Key`. Expect `{ public_key, private_key }`.
   - Insert `{ ip: assigned_ip, ap_id }` into `tunnel_ip_assignments`.
   - Update `access_points` row: `wg_public_key`, `wg_private_key_encrypted`, `tunnel_ip`, `tunnel_status='pending'`.
   - `POST {RELAY_URL}/internal/add-peer` with `{ public_key, assigned_ip }`.
4. Build the Mikrotik command string (interpolating `private_key`, `VPS_WG_PUBLIC_KEY`, `assigned_ip`) exactly per spec.
5. Return `{ tunnel_ip, command }` with CORS headers.

Required new Supabase secrets (added via secrets tool, user enters values): `MIKROTIK_RELAY_URL`, `MIKROTIK_RELAY_API_KEY`, `VPS_WG_PUBLIC_KEY`.

### 3. Types & hook update

- In `src/types/database.ts`, extend `AccessPoint` with the 5 new fields, all optional except `tunnel_status` which is the constrained union.
- In `src/hooks/use-access-points.ts`, change select to explicitly list new columns (or keep `*` since it auto-includes them — keep `*` and just rely on the type update). No behavioral change.

### 4. `src/pages/EditAccessPoint.tsx` updates (only file changed in UI)

- Form state changes:
  - Remove `router_ip`.
  - Add `tunnel_status`, `tunnel_ip`, `wg_public_key`, `generated_command`.
  - Sync these from `ap` in the existing `useEffect`.
- Add `useRef` guard `provisionedRef` to ensure provision-router is invoked at most once per mount when entering Step 2 with empty `tunnel_ip`. On success, populate `generated_command` + `tunnel_ip` in form state; on error, toast.
- Add Realtime effect: when `step === 2` and `tunnel_status !== 'connected'`, subscribe via `supabase.channel().on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'access_points', filter: \`id=eq.${id}\` }, ...)` and update `tunnel_status` / `tunnel_last_seen` in form state. Cleanup on unmount or when status flips to `connected`.
- Replace the entire `{step === 2 && ...}` JSX block with the new spec: command preview box, "Copy all commands" button (`navigator.clipboard.writeText`), colored status pill (green/red/amber-pulse), optional Router Model input, Bandwidth Profile `Select` (5/10/20 Mbps options), Back/Save buttons (Save label switches to "Save & Go Live" when connected), and Delete button.
- `handleSave`: drop manual `router_ip` field; set `router_ip: form.tunnel_ip || null` in the update payload. Keep `router_type`, `speed_profile_name`. Do NOT touch `wg_public_key` / `wg_private_key_encrypted`.

Step 1, the delete dialog, and all other pages/components remain untouched.

### 5. Out of scope (explicit)

- No changes to `AddAccessPoint.tsx` — provisioning happens in EditAccessPoint after creation.
- No VPS-side code; the relay endpoints `/internal/generate-keypair` and `/internal/add-peer` are assumed to already exist on your VPS.
- The mechanism that flips `tunnel_status` to `connected` (relay heartbeat → Supabase) is assumed to already update the `access_points` row; this plan only consumes that update via Realtime.

### Open questions before I implement

1. The current `access_points.router_ip` is described as "WireGuard IP, admin-assigned". After this change `router_ip` becomes a mirror of `tunnel_ip`. Do you want me to also drop `router_ip` in a follow-up migration, or keep both for now (current plan: keep both, mirror on save)?
2. Should `provision-router` be callable by any authenticated user, or only by the AP's owning provider / admins? Current plan: require auth, then verify caller owns the AP via `provider_id` linkage (or has admin role) before provisioning.