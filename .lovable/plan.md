

## Store Terms & Policy Agreement in Profile

### Why
Recording that a user agreed to Terms & Policy is important for legal compliance and audit trails. A boolean column is the minimum; storing the timestamp of agreement is even better for legal defensibility.

### Plan

1. **Database migration** -- Add a column to `public.profiles`:
   ```sql
   ALTER TABLE public.profiles
     ADD COLUMN terms_agreed_at timestamptz DEFAULT NULL;
   ```
   Using a timestamp rather than a plain boolean captures *when* the user agreed, which is more useful legally. A non-null value means "agreed"; null means "not yet agreed."

2. **Update type definitions** -- Add `terms_agreed_at: string | null` to the `Profile` interface in `src/types/database.ts` and `src/contexts/AuthContext.tsx`.

3. **Update SignUp page** -- In `src/pages/SignUp.tsx`, pass `terms_agreed_at: new Date().toISOString()` in the `signUp` metadata so the trigger can persist it.

4. **Update the `handle_new_user` trigger** -- Modify the existing database trigger to read the new metadata field and store it:
   ```sql
   terms_agreed_at = COALESCE(
     (NEW.raw_user_meta_data->>'terms_agreed_at')::timestamptz,
     now()
   )
   ```

5. **Display in admin views** -- Optionally show the agreement status/date in `KUsers.tsx` and `ProfileSettings.tsx` as a read-only field.

### Question
Before proceeding: should we use a **timestamp** (`terms_agreed_at`) to record when the user agreed, or do you prefer a simple **boolean** (`terms_agreed: true/false`)? The timestamp approach is recommended for legal compliance.

