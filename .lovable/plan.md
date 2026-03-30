

## Backlog v4.0 vs Current Dashboard — Gap Analysis

### What We Have Today (Current State)

The admin/owner dashboard currently supports:
- Auth with email/password, role-based access (admin/owner/user), super-admin protection
- Profile management (name, email, phone, avatar, gender, DOB, terms agreement)
- K-Zones CRUD with GIS coordinates and map previews
- Routers CRUD linked to zones
- K-Plans (bundles) CRUD — name, duration, price
- Transactions list (flat table with status badges)
- My Balance page with withdrawal dialog (UI-only, no real backend)
- User management with role assignment (admin-only)

### What the Backlog v4.0 Requires — Organized by Category

---

### A. Supabase Schema Changes (Database Migration)

The backlog introduces a **completely new schema** — the "Portable Bundle Architecture." Here is every table that needs to be created or modified:

**New Tables to Create:**
1. **`access_points`** — Replaces current `wifi_zones` + `routers` concept. Adds: `provider_id FK`, `zone_label`, `geom GEOGRAPHY(POINT)` (PostGIS), `ssid`, `bssid`, `propagation_radius_m`, `router_ip`, `router_type`, `router_user_encrypted`, `router_pass_encrypted`, `avg_rating`
2. **`providers`** — `user_id FK`, `business_name`, `phone`, `kyc_status ENUM`, `approved_at`
3. **`user_bundles`** — One per purchase: `user_id`, `plan_id FK`, `session_type ENUM(paid,gift)`, `total_minutes`, `status ENUM(active,exhausted,expired)`, `purchased_at`, `expires_at`, `idempotency_key UNIQUE`. `remaining_minutes` is **computed, never stored**.
4. **`session_segments`** — One per physical AP connection: `bundle_id FK`, `ap_id FK`, `user_id FK`, `mac_address`, `ios_token`, `status ENUM`, `started_at`, `scheduled_end`, `ended_at`, `time_used_minutes`, `mikrotik_user_name`
5. **`wallet_transactions`** — `user_id FK`, `type ENUM(recharge,debit,refund,reward,gift)`, `amount_xaf`, `fee_xaf`, `net_xaf`, `reference UNIQUE`, `mansar_ref`, `status ENUM(pending,confirmed,failed)`
6. **`provider_earnings_ledger`** — Per-segment revenue: `segment_id FK UNIQUE`, `bundle_id FK`, `ap_id FK`, `provider_id FK`, `time_used_minutes`, `plan_price_xaf`, `time_ratio`, `gross_xaf`, `platform_fee_xaf`, `net_xaf`, `allocated_at`
7. **`provider_wallets`** — `provider_id PK FK`, `balance_xaf BIGINT DEFAULT 0`
8. **`gift_credits`** — `user_id FK`, `type ENUM(first_time,monthly,referral)`, `minutes_total`, `minutes_remaining`, `granted_at`, `expires_at`, `exhausted_at`
9. **`referral_events`** — `referrer_id FK`, `referred_id FK`, `event_type ENUM(signup,first_purchase)`
10. **`notifications`** — `user_id FK`, `title`, `body`, `category ENUM`, `data JSONB`, `read_at`, `created_at`
11. **`device_tokens`** — `user_id FK`, `fcm_token`, `platform ENUM`, `updated_at`
12. **`ap_health_log`** — `ap_id FK`, `latency_ms`, `status ENUM(ok,degraded,down)`, `checked_at`
13. **`admin_audit_log`** — `admin_id FK`, `action`, `target_type`, `target_id`, `metadata JSONB`

**Existing Table Modifications:**
- **`profiles`** — Add: `wallet_balance_xaf BIGINT DEFAULT 0`, `referral_code CHAR(8) UNIQUE`, `referred_by FK nullable`, `first_trial_used_at`, `last_monthly_gift_at`
- **`bundles` (plans)** — Restructure to match v4 `plans` table: add `ap_id FK nullable`, `speed_profile_name`, `is_active BOOL`, `session_type ENUM(paid,gift)`, rename `duration`→`duration_minutes`, `price`→`price_xaf`

**New Database Functions:**
- `get_nearby_kzones(user_lat, user_lng, radius_m)` — PostGIS query
- `get_dashboard_stats()` — Aggregated admin KPIs

**New Views:**
- `v_sessions_by_zone`
- `v_provider_earnings_summary`

---

### B. Supabase Edge Functions

These are backend functions that the mobile app AND the dashboard will call:

| Edge Function | Purpose | Dashboard Relevance |
|---|---|---|
| `purchase-bundle` | Wallet deduction + user_bundles insert | Admin can see purchased bundles |
| `start-segment` | Validate bundle, create segment, call Mikrotik API | Admin monitors active sessions |
| `end-segment` | Compute time_used, provider revenue allocation, Mikrotik cleanup | Revenue appears in dashboard |
| `initiate-recharge` | Mansar Collection API call for wallet top-up | Admin sees wallet transactions |
| `recharge-webhook` | Mansar callback → confirm recharge → credit wallet | Auto-updates dashboard data |
| `send-notification` | FCM v1 push + notifications table insert | Admin can trigger bulk notifications |
| `ap-health-check` | pg_cron: ping each router, log to ap_health_log | Dashboard shows AP health indicators |
| `process-payout` | Mansar Disbursement API for provider withdrawals | Admin approves/monitors payouts |

---

### C. Dashboard Pages — What Needs to Change

**Existing pages that need significant updates:**

1. **Dashboard (home)** — US-019: Add real KPI cards: GMV, platform revenue, active sessions count, active bundles count. Add revenue-by-plan bar chart (Recharts). Add sessions-by-zone breakdown. Add per-AP health indicators (green/red/yellow). Add provider earnings summary table.

2. **K-Zones page** — US-017: Evolve to "Access Points" management. Each AP now has: provider assignment, SSID/BSSID, propagation radius, router IP, speed profile, status (online/offline/maintenance). Admin manages APs across all zones centrally.

3. **K-Plans page** — US-018: Add `is_active` toggle per plan. Add `speed_profile_name` field. Pre-seed 4 plans (150/2hr, 300/5hr, 1000/24hr, 0/30min gift). Add `session_type` display (paid vs gift).

4. **Users page** — US-020: Add search/filter. Click user → detail view showing bundle history with segment breakdown, wallet transactions. Admin actions: manual wallet credit (with reason note), deactivate account. Bulk notification compose & send.

5. **Transactions page** — Evolve to show `wallet_transactions` (the new v4 table) instead of the current `transactions` table. Show type (recharge/debit/refund/reward/gift), amount, fee, net, mansar_ref.

6. **My Balance page** — Wire withdrawal to `process-payout` Edge Function. Show provider earnings from `provider_earnings_ledger`. Enforce minimum 5,000 XAF withdrawal.

**New pages to build:**

7. **Provider Dashboard** (US-021, post-MVP) — `/dashboard/provider` route. Per-segment earnings view from `provider_earnings_ledger`. Balance card from `provider_wallets`. Payout request form.

8. **AP Health Monitor** (US-025) — Could be a tab on the dashboard or a dedicated page. Per-AP status indicators. Alert history from `ap_health_log`.

9. **User Detail page** — Click a user in KUsers → see their bundle history, session segments, wallet transactions, gift credits. Admin actions panel.

10. **Notifications Management** — Compose bulk notifications. Target by zone/balance range/all users.

---

### D. Implementation Priority (Recommended Order)

```text
Phase 1 — Schema Foundation (Sprint 1-2 alignment)
  ├── Run v4 schema migration SQL
  ├── Update TypeScript types for all new tables
  ├── Update existing hooks for renamed/restructured tables
  └── Deploy Edge Functions: purchase-bundle, start-segment, end-segment

Phase 2 — Financial Pipeline (Sprint 3-4 alignment)
  ├── Deploy Edge Functions: initiate-recharge, recharge-webhook
  ├── Evolve Transactions page to wallet_transactions
  ├── Wire My Balance withdrawals to process-payout
  └── Update Dashboard with real KPI aggregates

Phase 3 — Admin Tooling (Sprint 4 alignment)
  ├── User detail page with bundle/segment/wallet history
  ├── Bulk notifications UI
  ├── AP health monitoring page
  └── Admin audit logging

Phase 4 — Provider Portal (Post-MVP)
  ├── Provider dashboard with earnings view
  └── Provider payout requests
```

---

### E. Summary of Gaps

| Area | Current State | Backlog Requirement | Gap |
|---|---|---|---|
| Schema | wifi_zones + routers + bundles + transactions | access_points + plans + user_bundles + session_segments + 10 more tables | Major restructure |
| Edge Functions | 1 (create-user) | 8 needed | 7 new functions |
| Dashboard KPIs | Basic counts | GMV, revenue, active sessions, AP health | Significant |
| Plans management | Basic CRUD | Active toggle, speed profiles, gift plans | Moderate |
| User management | List + role change | Detail view, wallet credit, bulk notifications | Significant |
| Transactions | Simple flat list | wallet_transactions with fee breakdown, mansar_ref | Restructure |
| Provider portal | Not exists | Earnings view + payout | New feature |
| AP health | Not exists | Automated monitoring + alerts | New feature |
| Audit logging | Not exists | admin_audit_log table | New feature |

This is a substantial evolution. I recommend we tackle it phase by phase, starting with the schema migration since everything else depends on it. Shall I begin with Phase 1 — the v4 schema migration SQL and TypeScript type updates?

