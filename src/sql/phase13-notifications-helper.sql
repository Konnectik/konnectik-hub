-- =============================================
-- PHASE 13: Notifications helper + event-driven inserts
-- Run this SQL in your Supabase SQL Editor
-- =============================================
--
-- Centralizes notification creation so edge functions and triggers can fire
-- consistent notifications without duplicating insert code. RLS on
-- notifications already restricts SELECT to user_id = auth.uid().

CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _title TEXT,
  _body TEXT,
  _category public.notification_category DEFAULT 'system',
  _data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, body, category, data)
  VALUES (_user_id, _title, _body, _category, _data)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, public.notification_category, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, public.notification_category, JSONB) TO service_role;

-- =============================================
-- Triggers that auto-create notifications on key events
-- =============================================

-- 1) Wallet transaction confirmed → notify the user
CREATE OR REPLACE FUNCTION public.notify_wallet_tx_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status <> 'confirmed' THEN
    IF NEW.type = 'recharge' THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'Recharge confirmée',
        format('%s XAF ont été ajoutés à votre wallet.', NEW.net_xaf),
        'wallet',
        jsonb_build_object('transaction_id', NEW.id, 'amount_xaf', NEW.net_xaf)
      );
    ELSIF NEW.type = 'debit' THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'Paiement effectué',
        format('%s XAF débités du wallet.', NEW.amount_xaf),
        'wallet',
        jsonb_build_object('transaction_id', NEW.id, 'amount_xaf', NEW.amount_xaf)
      );
    END IF;
  ELSIF NEW.status = 'failed' AND OLD.status <> 'failed' THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Transaction échouée',
      CASE
        WHEN NEW.type = 'recharge' THEN 'Votre recharge n''a pas pu être validée. Aucun montant n''a été débité.'
        ELSE 'Votre transaction n''a pas pu être traitée.'
      END,
      'wallet',
      jsonb_build_object('transaction_id', NEW.id, 'type', NEW.type)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallet_tx_notify ON public.wallet_transactions;
CREATE TRIGGER wallet_tx_notify
  AFTER UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_wallet_tx_update();

-- 2) New bundle purchased → notify the user
CREATE OR REPLACE FUNCTION public.notify_bundle_purchased()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.user_id,
    'Forfait activé',
    format('Votre forfait de %s minutes est prêt à être utilisé.', NEW.total_minutes),
    'bundle',
    jsonb_build_object('bundle_id', NEW.id, 'total_minutes', NEW.total_minutes)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_bundle_notify ON public.user_bundles;
CREATE TRIGGER user_bundle_notify
  AFTER INSERT ON public.user_bundles
  FOR EACH ROW EXECUTE FUNCTION public.notify_bundle_purchased();

-- 3) Bundle exhausted → notify the user
CREATE OR REPLACE FUNCTION public.notify_bundle_exhausted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'exhausted' AND OLD.status <> 'exhausted' THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Forfait épuisé',
      'Votre forfait est terminé. Achetez-en un nouveau pour continuer.',
      'bundle',
      jsonb_build_object('bundle_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_bundle_exhausted_notify ON public.user_bundles;
CREATE TRIGGER user_bundle_exhausted_notify
  AFTER UPDATE ON public.user_bundles
  FOR EACH ROW EXECUTE FUNCTION public.notify_bundle_exhausted();

-- 4) Payout completed / failed → notify the requester (provider)
CREATE OR REPLACE FUNCTION public.notify_payout_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    PERFORM public.create_notification(
      NEW.requested_by,
      'Payout reçu',
      format('Votre payout de %s XAF a été envoyé.', NEW.net_xaf),
      'wallet',
      jsonb_build_object('payout_id', NEW.id, 'net_xaf', NEW.net_xaf)
    );
  ELSIF NEW.status = 'failed' AND OLD.status <> 'failed' THEN
    PERFORM public.create_notification(
      NEW.requested_by,
      'Payout échoué',
      format('Votre payout de %s XAF a échoué. Le montant a été remboursé sur votre solde provider.', NEW.amount_xaf),
      'wallet',
      jsonb_build_object('payout_id', NEW.id, 'reason', NEW.error_message)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payout_status_notify ON public.payout_requests;
CREATE TRIGGER payout_status_notify
  AFTER UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_payout_status();
