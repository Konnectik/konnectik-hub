-- =============================================
-- PHASE 7: Auto-create provider + wallet on owner signup
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- Update handle_new_user() to also create a provider record + wallet
-- when signup_source = 'platform' (i.e. owner role).
--
-- NOTE: This assumes your existing handle_new_user() already:
--   1. Inserts into public.profiles
--   2. Inserts into public.user_roles with 'owner' when signup_source = 'platform'
--
-- We ADD the provider + wallet creation after the owner role insert.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _signup_source TEXT;
  _provider_id UUID;
BEGIN
  _signup_source := COALESCE(NEW.raw_user_meta_data->>'signup_source', 'mobile');

  -- 1. Create profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );

  -- 2. Assign role based on signup source
  IF _signup_source = 'platform' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner');

    -- 3. Auto-create provider profile + wallet for owners
    INSERT INTO public.providers (user_id, business_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business'))
    RETURNING id INTO _provider_id;

    INSERT INTO public.provider_wallets (provider_id, balance_xaf)
    VALUES (_provider_id, 0);
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;

  RETURN NEW;
END;
$$;
