-- =============================================
-- PHASE 14: Referral program automation
-- Run this SQL in your Supabase SQL Editor
-- =============================================
--
-- Activates the dormant referral infrastructure:
--   * Auto-generates a unique 8-char referral_code for every profile (existing
--     rows + future rows via trigger).
--   * On signup, if the new user's auth.users.user_metadata.referral_code
--     matches an existing profile, captures it in referred_by and logs a
--     'signup' referral_event.
--   * On first confirmed wallet debit (first_purchase) by a referred user,
--     logs a 'first_purchase' referral_event AND grants 60 free minutes to
--     the referrer via gift_credits (type=referral).

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS CHAR(8)
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  code CHAR(8);
  exists_count INT;
BEGIN
  LOOP
    code := '';
    FOR _ IN 1..8 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::INT, 1);
    END LOOP;
    SELECT COUNT(*) INTO exists_count FROM public.profiles WHERE referral_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$;

-- Backfill existing profiles missing a referral_code
UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- Trigger to auto-assign referral_code on new profile
CREATE OR REPLACE FUNCTION public.set_referral_code_on_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_referral_code ON public.profiles;
CREATE TRIGGER profiles_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_code_on_profile();

-- =============================================
-- Capture referral at signup
-- =============================================
-- Idea: when handle_new_user creates the profile, the auth.users metadata
-- contains a 'referral_code' field passed by the client. This trigger fires
-- AFTER the profile row exists and links them.

CREATE OR REPLACE FUNCTION public.handle_referral_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_code TEXT;
  referrer UUID;
BEGIN
  -- Look up the referral code the user typed at signup.
  SELECT (raw_user_meta_data ->> 'referral_code')::TEXT
    INTO meta_code
    FROM auth.users
    WHERE id = NEW.id;

  IF meta_code IS NULL OR length(meta_code) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT id INTO referrer
    FROM public.profiles
    WHERE referral_code = upper(meta_code)
      AND id <> NEW.id
    LIMIT 1;

  IF referrer IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles SET referred_by = referrer WHERE id = NEW.id;
  INSERT INTO public.referral_events (referrer_id, referred_id, event_type)
    VALUES (referrer, NEW.id, 'signup')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_handle_referral ON public.profiles;
CREATE TRIGGER profiles_handle_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_referral_on_signup();

-- =============================================
-- Reward referrer on referred user's first confirmed purchase
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_first_purchase_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer UUID;
  prior_purchase_count INT;
BEGIN
  -- Only first confirmed debit triggers a reward
  IF NEW.type <> 'debit' OR NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'confirmed' THEN
    RETURN NEW; -- already confirmed before; nothing to do
  END IF;

  SELECT referred_by INTO referrer
    FROM public.profiles
    WHERE id = NEW.user_id;

  IF referrer IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count earlier confirmed debits by this user — must be 0 for first purchase
  SELECT COUNT(*) INTO prior_purchase_count
    FROM public.wallet_transactions
    WHERE user_id = NEW.user_id
      AND type = 'debit'
      AND status = 'confirmed'
      AND id <> NEW.id;

  IF prior_purchase_count > 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.referral_events (referrer_id, referred_id, event_type)
    VALUES (referrer, NEW.user_id, 'first_purchase')
    ON CONFLICT DO NOTHING;

  -- Grant 60 min gift credit to the referrer (idempotent via unique events).
  INSERT INTO public.gift_credits (user_id, type, minutes_total, minutes_remaining)
    VALUES (referrer, 'referral', 60, 60);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallet_first_purchase_referral ON public.wallet_transactions;
CREATE TRIGGER wallet_first_purchase_referral
  AFTER UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_first_purchase_referral();
