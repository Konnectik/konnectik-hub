# Konnectik API Reference

Centralized documentation for all server-side surfaces: Supabase tables, RPCs, edge functions, and the Mikrotik VPS relay. Keep this file updated whenever the schema or any function signature changes.

---

## 1. Supabase tables (high level)

| Table | Owner of the row | Notes |
|---|---|---|
| `profiles` | auth.users.id | `wallet_balance_xaf`, `referral_code` (auto-generated), `referred_by`, `first_trial_used_at`, `last_monthly_gift_at` |
| `access_points` | provider | `latitude`, `longitude`, `propagation_radius_m`, `status`, tunnel fields (`tunnel_status`, `tunnel_ip`, `wg_*`) |
| `bundles` | platform | catalog plans, public-readable |
| `user_bundles` | profile | purchased bundle: `total_minutes`, `expires_at`, `status` |
| `session_segments` | profile | one row per Wi-Fi session; `time_used_minutes` filled on close |
| `wallet_transactions` | profile | recharge/debit/refund/reward/gift, `aggregator_ref` = Netwallet TransactionId |
| `provider_earnings_ledger` | provider | one row per closed segment, `gross_xaf`/`platform_fee_xaf`/`net_xaf` |
| `provider_wallets` | provider | `balance_xaf` — debited on payout, credited on `end-segment` |
| `payout_requests` | provider | persistent log of every payout, with `status` and `aggregator_ref` |
| `gift_credits` | profile | minutes_total/minutes_remaining, type = first_time/monthly/referral |
| `referral_events` | profile | one row per signup/first_purchase tied to a referrer |
| `notifications` | profile | in-app feed, categories: system/promo/session/wallet/bundle |
| `device_tokens` | profile | Web Push subscriptions (`platform = web`) or future FCM/APNS tokens |
| `tunnel_ip_assignments` | service_role only | reserved WG IPs `10.99.x.x` for routers |

All tables have RLS enabled. Default policy is **`user_id = auth.uid()` for SELECT** unless noted otherwise. Admin role (`has_role(auth.uid(), 'admin')`) sees everything; provider role sees rows where `provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())`.

---

## 2. RPCs (PostgreSQL functions exposed to the client)

### `get_dashboard_stats() → JSON`
Role-aware KPI snapshot. Returns one of three scopes:

- `scope = 'admin'` → full platform metrics (GMV, platform revenue, total users, …).
- `scope = 'provider'` → metrics restricted to the caller's APs and earnings only.
- `scope = 'user'` / `'anonymous'` → all metrics return 0.

Refresh every 30 s on the dashboard.

### `transfer_gift_minutes(_to_user UUID, _minutes INT) → JSON`
User-to-user transfer of gift minutes (consumed FIFO from the caller's `gift_credits`). Creates an `in-app notification` for the recipient. Caps at 240 minutes per transfer.

### `grant_monthly_gifts(_minutes INT default 15) → granted_count`
Admin-only. Idempotent per calendar month. Sets `profiles.last_monthly_gift_at` so retries are safe.

### `create_notification(_user_id, _title, _body, _category, _data)`
service_role helper. Used by every trigger that fires an in-app notification.

---

## 3. Edge functions

All edge functions live under `supabase/functions/<name>/index.ts`. Deploy with:
```sh
npx supabase functions deploy <name> --project-ref ufdzcxycgprgvigyotnk
```

| Function | Auth | Purpose | Notes |
|---|---|---|---|
| `purchase-bundle` | JWT (user) | Debit wallet, create `user_bundle`, optional early proximity gate (`ap_id` + GPS) | GPS check optional here — `start-segment` enforces it |
| `start-segment` | JWT (user) | Create active segment + provision Mikrotik user. **Requires** `ap_id`, `user_lat`, `user_lng` | Hard-fails if user is outside `propagation_radius_m * 1.3 + 50m + gps_accuracy_m` |
| `end-segment` | JWT (user) | Atomic close, compute `time_used_minutes`, credit provider ledger + wallet | Idempotent (returns 200 if already ended); kicks user on Mikrotik via `remove-user` + `kick-active` |
| `initiate-recharge` | JWT (user) | Netwallet `request-payment`, create pending `wallet_transactions` row | Logs token & request-payment timing; aborts at 10s/20s |
| `recharge-webhook` | none (`verify_jwt=false`) | Netwallet callback: confirm/fail tx + atomic wallet credit | Idempotent via `UPDATE WHERE status='pending'` returning 0 rows on retry |
| `process-payout` | JWT (provider only) | Debit **provider_wallet** atomically + create `payout_requests` + call Netwallet payout | Bank transfers leave row as `pending` for admin processing |
| `payout-webhook` | none (`verify_jwt=false`) | Netwallet payout callback: mark completed/failed, refund wallet on failure | Idempotent |
| `provision-router` | JWT (admin or owning provider) | Generate WG keypair via VPS relay + persist on AP | Allocates IP in `10.99.x.x` range |
| `send-push` | service_role (via DB Webhook) | Send Web Push to all `device_tokens` of a user | Requires VAPID env vars — see push setup below |

### Calling pattern

Clients call edge functions through `supabase.functions.invoke(name, { body })`. The Supabase JS client auto-attaches the user's JWT in the `Authorization` header.

For webhooks (`recharge-webhook`, `payout-webhook`), JWT verification is disabled at function level via `supabase/config.toml`:

```toml
[functions.recharge-webhook]
verify_jwt = false

[functions.payout-webhook]
verify_jwt = false
```

---

## 4. Triggers & auto-notifications

Configured via SQL migrations in `src/sql/`:

| File | Effect |
|---|---|
| `phase11-financial-isolation.sql` | Role-aware `get_dashboard_stats` |
| `phase12-payout-requests.sql` | `payout_requests` table + RLS |
| `phase13-notifications-helper.sql` | `create_notification` RPC + auto-triggers on wallet_transactions, user_bundles, payout_requests |
| `phase14-referral-automation.sql` | Auto-generate 8-char `referral_code`, capture `referred_by` from signup metadata, grant 60min gift on first purchase by referred user |
| `phase15-rewards-gifts.sql` | first_time gift (30min) on signup, monthly grant RPC, user-to-user `transfer_gift_minutes` |

Lance ces fichiers dans le **SQL Editor de Supabase** dans l'ordre numéroté.

---

## 5. Mikrotik VPS Relay

Hosted at `relay.konnectik.cm` (Node.js service at `/opt/konnectik-relay`). systemd unit: `konnectik-relay.service`. Env file: `/opt/konnectik-relay/.env`.

### Internal endpoints (X-API-Key auth, only reachable from edge functions)

| Endpoint | Method | Body | Used by |
|---|---|---|---|
| `/internal/generate-keypair` | POST | `{}` | `provision-router` |
| `/internal/add-peer` | POST | `{ public_key, assigned_ip }` | `provision-router` |
| `/hotspot/add-user` | POST | `{ router_ip, username, password, time_limit }` | `start-segment` |
| `/hotspot/remove-user` | POST | `{ router_ip, username }` | `end-segment` |
| `/hotspot/kick-active` | POST | `{ router_ip, username }` | `end-segment` (soft fail if not implemented) |

### Heartbeat loop

Every 30 seconds the relay polls `wg show` for the latest handshake of each peer and, for connected routers, also calls the Mikrotik REST API (`http://<router_ip>/rest/…`) using `ROUTER_DEFAULT_USER` / `ROUTER_DEFAULT_PASS` from the relay `.env`. The result drives `access_points.tunnel_status` and `status`:

| WG handshake | REST API ping | `status` |
|---|---|---|
| up | OK | `online` |
| up | failed | `maintenance` |
| down | — | `offline` |

⚠️ Make sure every Mikrotik router has an `admin` user (or the configured username) with the password set to `ROUTER_DEFAULT_PASS`, otherwise the heartbeat keeps flipping `status` to `maintenance`.

---

## 6. Web Push setup (in-app + system notifications)

1. Generate VAPID keys once:
   ```sh
   npx web-push generate-vapid-keys
   ```
2. Save them on Supabase:
   ```sh
   npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:ops@konnectik.cm --project-ref ufdzcxycgprgvigyotnk
   ```
3. Save `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same value as `VAPID_PUBLIC_KEY`) in Netlify env so the PWA can subscribe.
4. Deploy `send-push`:
   ```sh
   npx supabase functions deploy send-push --project-ref ufdzcxycgprgvigyotnk
   ```
5. In Supabase Dashboard → Database → Webhooks, create one targeting `public.notifications` INSERT → HTTP POST to `/functions/v1/send-push` (Bearer = service_role key).

The PWA's `PushSubscribe` component (`konnectik/components/push-subscribe.tsx`) auto-subscribes the user once `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is set, and stores the subscription in `device_tokens`.

---

## 7. Secrets reference (Supabase)

| Secret | Used by |
|---|---|
| `NETWALLET_BASE_URL` | initiate-recharge, process-payout |
| `NETWALLET_PRIMARY_KEY` | initiate-recharge, process-payout (Bearer token) |
| `NETWALLET_EMAIL` | initiate-recharge, process-payout (Bearer token) |
| `NETWALLET_SECONDARY_KEY` | initiate-recharge, process-payout, recharge-webhook, payout-webhook (Hash + X-CallbackToken) |
| `MIKROTIK_RELAY_URL` | start-segment, end-segment, provision-router |
| `MIKROTIK_RELAY_API_KEY` | same |
| `VPS_WG_PUBLIC_KEY` | provision-router (returned to client for the RouterOS script) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | send-push |

Rotate every 90 days. After rotation, redeploy each affected edge function so it picks up the new env.

---

## 8. Logging conventions

Every edge function logs structured events with a `[function-name]` prefix:

```
[initiate-recharge] start { userId, amount_xaf, payment_method, orderId, ... }
[initiate-recharge] token 200 in 511ms
[initiate-recharge] request-payment 400 in 7589ms
[initiate-recharge] nw response { httpStatus, nwStatusCode, errorCode, message }
[end-segment] proximity check { userId, ap_id, distance_m, max_allowed_m }
[recharge-webhook] credit applied { txId, userId, creditedXaf, balanceBefore, balanceAfter }
```

Inspect via Supabase Dashboard → Edge Functions → \[name\] → Logs, or via the CLI:

```sh
npx supabase functions logs <name> --project-ref ufdzcxycgprgvigyotnk
```

For centralized aggregation, point a Logflare/Datadog sink at the project. Recommended fields to alert on: `level=error`, `FATAL`, `EarlyDrop` shutdown reason (= a network hang, usually Netwallet timeout).

---

## 9. Migration / deploy checklist

Before pushing to prod:

1. Run pending SQL migrations from `src/sql/` in order.
2. Deploy edge functions whose code changed.
3. Update Supabase Database Webhook for `send-push` if the function URL changed.
4. Push PWA via Netlify (auto on `main` push).
5. Run a manual smoke test: signup → recharge → buy bundle → start session → end session → payout request.
