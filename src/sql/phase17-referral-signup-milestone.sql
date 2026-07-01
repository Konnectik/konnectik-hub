-- =============================================
-- PHASE 17: Referral reward on signup milestones
-- Every 10 referred signups → 30 gift minutes to referrer
-- Replaces the first-purchase 60min reward (purchase-based tracking kept for stats only)
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_referral_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_code TEXT;
  referrer UUID;
  signup_count INT;
BEGIN
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
    VALUES (referrer, NEW.id, 'signup');

  SELECT COUNT(*) INTO signup_count
    FROM public.referral_events
    WHERE referrer_id = referrer
      AND event_type = 'signup';

  IF signup_count > 0 AND signup_count % 10 = 0 THEN
    INSERT INTO public.gift_credits (user_id, type, minutes_total, minutes_remaining, expires_at)
      VALUES (referrer, 'referral', 30, 30, now() + interval '90 days');

    PERFORM public.create_notification(
      referrer,
      'Récompense parrainage',
      '30 minutes offertes : 10 amis ont rejoint Konnectik avec votre code !',
      'reward',
      jsonb_build_object('signup_count', signup_count, 'minutes', 30)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Disable first-purchase referrer reward (signup milestones are the source of truth)
DROP TRIGGER IF EXISTS wallet_first_purchase_referral ON public.wallet_transactions;
DROP FUNCTION IF EXISTS public.handle_first_purchase_referral();