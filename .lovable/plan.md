

## Admin Provider Management + Auto-Create Provider on Signup

### Summary
Two changes: (1) a new "Providers" tab on the K-Owners section of the Users page where admins can create/edit provider profiles linked to owner accounts, and (2) a database trigger that auto-creates a `providers` row + `provider_wallets` row when a user signs up with the `owner` role.

### 1. SQL Migration — Auto-create provider on owner signup

Update the `handle_new_user()` trigger function to also insert into `providers` and `provider_wallets` when `signup_source = 'platform'`:

```sql
-- After the owner role insert:
INSERT INTO public.providers (user_id, business_name)
VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business'));

INSERT INTO public.provider_wallets (provider_id, balance_xaf)
VALUES (
  (SELECT id FROM public.providers WHERE user_id = NEW.id),
  0
);
```

Save as `src/sql/phase7-auto-provider.sql`. User must run in Supabase SQL Editor.

### 2. Admin Provider Management UI

Add a **"Providers"** tab inside the K-Owners tab area on `KUsers.tsx` — or more cleanly, a dedicated management section. Given the existing tab structure, the best approach is:

- **New file: `src/pages/ProviderManagement.tsx`** — admin-only page at `/dashboard/providers`
- Add nav link in `DashboardNav.tsx` (admin-only, between Users and K-Plans)
- Add route in `App.tsx`

**Page features:**
- Table listing all providers with: business_name, linked owner name (join profiles), phone, KYC status, wallet balance, created_at
- "Create Provider" dialog: select an owner (dropdown of users with `owner` role who don't yet have a provider record), enter business_name, phone
- Click row → inline edit dialog for business_name, phone, KYC status
- Delete provider option with confirmation

### 3. New hook: `src/hooks/use-providers.ts`

- `useProviders()` — fetch all providers joined with profiles for admin view
- `useUnlinkedOwners()` — fetch owner-role users who have no providers row
- `createProvider(userId, businessName, phone)` — insert into providers + provider_wallets
- `updateProvider(id, updates)` — update provider details
- `deleteProvider(id)` — delete provider

### Files to create/edit

| File | Action |
|------|--------|
| `src/sql/phase7-auto-provider.sql` | Create — migration to update trigger |
| `src/hooks/use-providers.ts` | Create — data hooks |
| `src/pages/ProviderManagement.tsx` | Create — admin page |
| `src/components/DashboardNav.tsx` | Edit — add "Providers" nav link (admin-only) |
| `src/App.tsx` | Edit — add route |

