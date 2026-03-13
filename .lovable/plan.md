

## Problem

The `handle_new_user()` database trigger assigns `'owner'` to **every** new signup, including mobile app users who should get `'user'`.

## Solution

Use Supabase's `raw_user_meta_data` to distinguish signup sources. The web platform signup will pass a metadata flag (`signup_source: 'platform'`), and the trigger will check it:

- If `signup_source = 'platform'` → assign `'owner'`
- Otherwise (mobile app or any other source) → assign `'user'`

### Changes

1. **`src/sql/phase1-schema.sql`** — Update the `handle_new_user()` function:
   ```sql
   IF NEW.raw_user_meta_data->>'signup_source' = 'platform' THEN
     INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
   ELSE
     INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
   END IF;
   ```

2. **`src/contexts/AuthContext.tsx`** — Add `signup_source: 'platform'` to the signup metadata:
   ```typescript
   data: { full_name: fullName, signup_source: 'platform' }
   ```

3. **SQL migration** — A `CREATE OR REPLACE FUNCTION` statement to update the live trigger without recreating it.

This way, mobile app signups default to `'user'` and web platform signups get `'owner'`.

