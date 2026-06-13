-- =============================================
-- PHASE 15: Rewards & Gifts automation + user-to-user transfers
-- Run this SQL in your Supabase SQL Editor
-- =============================================
--
-- Adds:
--   * Auto-grant 30min first_time gift on signup (if eligible).
--   * Monthly 15min gift to every active user (called by a scheduled cron or
--     manually triggered via RPC).
--   * `transfer_gift_minutes(_to_user, _minutes)` RPC for user-to-user gifts.

-- 1. First-time gift on signup -------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_first_time_gift()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  already_granted INT;
BEGIN
  SELECT COUNT(*) INTO already_granted
    FROM public.gift_credits
    WHERE user_id = NEW.id AND type = 'first_time';
  IF already_granted > 0 THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.gift_credits (user_id, type, minutes_total, minutes_remaining, expires_at)
    VALUES (NEW.id, 'first_time', 30, 30, now() + interval '30 days');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_first_time_gift ON public.profiles;
CREATE TRIGGER profiles_first_time_gift
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_first_time_gift();

-- 2. Monthly gift — admin-callable, idempotent per calendar month --------------
CREATE OR REPLACE FUNCTION public.grant_monthly_gifts(_minutes INT DEFAULT 15)
RETURNS TABLE(granted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant monthly gifts';
  END IF;

  WITH eligible AS (
    SELECT p.id
    FROM public.profiles p
    WHERE p.last_monthly_gift_at IS NULL
       OR p.last_monthly_gift_at < date_trunc('month', now())
  ), inserted AS (
    INSERT INTO public.gift_credits (user_id, type, minutes_total, minutes_remaining, expires_at)
    SELECT id, 'monthly', _minutes, _minutes, now() + interval '30 days'
    FROM eligible
    RETURNING user_id
  )
  UPDATE public.profiles
    SET last_monthly_gift_at = now()
    WHERE id IN (SELECT user_id FROM inserted);

  RETURN QUERY SELECT COUNT(*)::BIGINT FROM public.profiles
    WHERE last_monthly_gift_at >= date_trunc('month', now());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_monthly_gifts(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_monthly_gifts(INT) TO authenticated;

-- 3. User-to-user gift transfer ------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_gift_minutes(_to_user UUID, _minutes INT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender UUID := auth.uid();
  sender_remaining INT;
  receiver_exists INT;
BEGIN
  IF sender IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _to_user = sender THEN
    RAISE EXCEPTION 'Cannot send a gift to yourself';
  END IF;
  IF _minutes IS NULL OR _minutes <= 0 OR _minutes > 240 THEN
    RAISE EXCEPTION 'Invalid amount (must be 1-240 minutes)';
  END IF;

  SELECT COUNT(*) INTO receiver_exists FROM public.profiles WHERE id = _to_user;
  IF receiver_exists = 0 THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;

  -- Sum sender's available gift minutes
  SELECT COALESCE(SUM(minutes_remaining), 0) INTO sender_remaining
    FROM public.gift_credits
    WHERE user_id = sender
      AND minutes_remaining > 0
      AND (expires_at IS NULL OR expires_at > now())
      AND exhausted_at IS NULL;

  IF sender_remaining < _minutes THEN
    RAISE EXCEPTION 'Insufficient gift minutes (available: %)', sender_remaining;
  END IF;

  -- Consume from oldest first
  WITH ordered AS (
    SELECT id, minutes_remaining,
           SUM(minutes_remaining) OVER (ORDER BY granted_at) AS running
    FROM public.gift_credits
    WHERE user_id = sender
      AND minutes_remaining > 0
      AND (expires_at IS NULL OR expires_at > now())
      AND exhausted_at IS NULL
  ), to_consume AS (
    SELECT id,
      LEAST(
        minutes_remaining,
        GREATEST(0, _minutes - COALESCE(LAG(running) OVER (ORDER BY id), 0))
      ) AS consume
    FROM ordered
    WHERE running - minutes_remaining < _minutes
  )
  UPDATE public.gift_credits g
    SET minutes_remaining = minutes_remaining - tc.consume,
        exhausted_at = CASE WHEN minutes_remaining - tc.consume <= 0 THEN now() ELSE exhausted_at END
    FROM to_consume tc
    WHERE g.id = tc.id;

  -- Credit recipient
  INSERT INTO public.gift_credits (user_id, type, minutes_total, minutes_remaining, expires_at)
    VALUES (_to_user, 'referral', _minutes, _minutes, now() + interval '30 days');

  -- In-app notification for recipient
  PERFORM public.create_notification(
    _to_user,
    'Cadeau reçu',
    format('%s minutes de Wi-Fi vous ont été offertes.', _minutes),
    'promo',
    jsonb_build_object('from_user_id', sender, 'minutes', _minutes)
  );

  RETURN json_build_object(
    'sender', sender,
    'recipient', _to_user,
    'minutes', _minutes,
    'sender_remaining', sender_remaining - _minutes
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transfer_gift_minutes(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_gift_minutes(UUID, INT) TO authenticated;
