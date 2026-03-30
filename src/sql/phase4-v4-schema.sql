-- =============================================
-- PHASE 4: Konnectik v4 — Portable Bundle Architecture
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- ========== ENUMS ==========

CREATE TYPE public.kyc_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.bundle_status AS ENUM ('active', 'exhausted', 'expired');
CREATE TYPE public.session_type AS ENUM ('paid', 'gift');
CREATE TYPE public.segment_status AS ENUM ('active', 'ended', 'expired', 'error');
CREATE TYPE public.wallet_tx_type AS ENUM ('recharge', 'debit', 'refund', 'reward', 'gift');
CREATE TYPE public.wallet_tx_status AS ENUM ('pending', 'confirmed', 'failed');
CREATE TYPE public.gift_credit_type AS ENUM ('first_time', 'monthly', 'referral');
CREATE TYPE public.referral_event_type AS ENUM ('signup', 'first_purchase');
CREATE TYPE public.notification_category AS ENUM ('system', 'promo', 'session', 'wallet', 'bundle');
CREATE TYPE public.device_platform AS ENUM ('ios', 'android', 'web');
CREATE TYPE public.ap_health_status AS ENUM ('ok', 'degraded', 'down');
CREATE TYPE public.ap_status AS ENUM ('online', 'offline', 'maintenance');

-- ========== MODIFY EXISTING TABLES ==========

-- profiles: add wallet & referral columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_balance_xaf BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code CHAR(8) UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_trial_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_monthly_gift_at TIMESTAMPTZ;

-- bundles: add v4 fields (keeping existing columns for backward compat)
ALTER TABLE public.bundles
  ADD COLUMN IF NOT EXISTS speed_profile_name TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS session_type public.session_type DEFAULT 'paid';

-- ========== NEW TABLES ==========

-- 1. Providers
CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  phone TEXT,
  kyc_status public.kyc_status DEFAULT 'pending' NOT NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Access Points
CREATE TABLE public.access_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,
  zone_label TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ssid TEXT,
  bssid TEXT,
  propagation_radius_m INTEGER DEFAULT 100,
  router_ip TEXT,
  router_type TEXT,
  router_user_encrypted TEXT,
  router_pass_encrypted TEXT,
  speed_profile_name TEXT,
  status public.ap_status DEFAULT 'offline' NOT NULL,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.access_points ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER access_points_updated_at
  BEFORE UPDATE ON public.access_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. User Bundles
CREATE TABLE public.user_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.bundles(id) ON DELETE SET NULL,
  session_type public.session_type DEFAULT 'paid' NOT NULL,
  total_minutes INTEGER NOT NULL,
  status public.bundle_status DEFAULT 'active' NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE
);

ALTER TABLE public.user_bundles ENABLE ROW LEVEL SECURITY;

-- 4. Session Segments
CREATE TABLE public.session_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID REFERENCES public.user_bundles(id) ON DELETE CASCADE NOT NULL,
  ap_id UUID REFERENCES public.access_points(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mac_address TEXT,
  ios_token TEXT,
  status public.segment_status DEFAULT 'active' NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  scheduled_end TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  time_used_minutes INTEGER DEFAULT 0,
  mikrotik_user_name TEXT
);

ALTER TABLE public.session_segments ENABLE ROW LEVEL SECURITY;

-- 5. Wallet Transactions
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type public.wallet_tx_type NOT NULL,
  amount_xaf BIGINT NOT NULL,
  fee_xaf BIGINT DEFAULT 0,
  net_xaf BIGINT NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  mansar_ref TEXT,
  status public.wallet_tx_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 6. Provider Earnings Ledger
CREATE TABLE public.provider_earnings_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID REFERENCES public.session_segments(id) ON DELETE CASCADE UNIQUE NOT NULL,
  bundle_id UUID REFERENCES public.user_bundles(id) ON DELETE SET NULL,
  ap_id UUID REFERENCES public.access_points(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,
  time_used_minutes INTEGER NOT NULL,
  plan_price_xaf BIGINT NOT NULL,
  time_ratio NUMERIC(8,6) NOT NULL,
  gross_xaf BIGINT NOT NULL,
  platform_fee_xaf BIGINT NOT NULL,
  net_xaf BIGINT NOT NULL,
  allocated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.provider_earnings_ledger ENABLE ROW LEVEL SECURITY;

-- 7. Provider Wallets
CREATE TABLE public.provider_wallets (
  provider_id UUID PRIMARY KEY REFERENCES public.providers(id) ON DELETE CASCADE,
  balance_xaf BIGINT DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.provider_wallets ENABLE ROW LEVEL SECURITY;

-- 8. Gift Credits
CREATE TABLE public.gift_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type public.gift_credit_type NOT NULL,
  minutes_total INTEGER NOT NULL,
  minutes_remaining INTEGER NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ,
  exhausted_at TIMESTAMPTZ
);

ALTER TABLE public.gift_credits ENABLE ROW LEVEL SECURITY;

-- 9. Referral Events
CREATE TABLE public.referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type public.referral_event_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

-- 10. Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category public.notification_category DEFAULT 'system' NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 11. Device Tokens
CREATE TABLE public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fcm_token TEXT NOT NULL,
  platform public.device_platform NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, fcm_token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- 12. AP Health Log
CREATE TABLE public.ap_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ap_id UUID REFERENCES public.access_points(id) ON DELETE CASCADE NOT NULL,
  latency_ms INTEGER,
  status public.ap_health_status NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.ap_health_log ENABLE ROW LEVEL SECURITY;

-- 13. Admin Audit Log
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ========== INDEXES ==========

CREATE INDEX idx_access_points_provider ON public.access_points(provider_id);
CREATE INDEX idx_access_points_status ON public.access_points(status);
CREATE INDEX idx_user_bundles_user ON public.user_bundles(user_id);
CREATE INDEX idx_user_bundles_status ON public.user_bundles(status);
CREATE INDEX idx_session_segments_bundle ON public.session_segments(bundle_id);
CREATE INDEX idx_session_segments_user ON public.session_segments(user_id);
CREATE INDEX idx_session_segments_ap ON public.session_segments(ap_id);
CREATE INDEX idx_session_segments_status ON public.session_segments(status);
CREATE INDEX idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX idx_provider_earnings_provider ON public.provider_earnings_ledger(provider_id);
CREATE INDEX idx_gift_credits_user ON public.gift_credits(user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_ap_health_log_ap ON public.ap_health_log(ap_id);
CREATE INDEX idx_admin_audit_log_admin ON public.admin_audit_log(admin_id);

-- ========== RLS POLICIES ==========

-- Providers
CREATE POLICY "Admins manage all providers" ON public.providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Providers view own record" ON public.providers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Access Points
CREATE POLICY "Admins manage all APs" ON public.access_points FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Providers manage own APs" ON public.access_points FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()))
  WITH CHECK (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));
CREATE POLICY "Authenticated can view active APs" ON public.access_points FOR SELECT TO authenticated
  USING (status = 'online');

-- User Bundles
CREATE POLICY "Admins manage all bundles" ON public.user_bundles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own bundles" ON public.user_bundles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Session Segments
CREATE POLICY "Admins manage all segments" ON public.session_segments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own segments" ON public.session_segments FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Providers view segments on own APs" ON public.session_segments FOR SELECT TO authenticated
  USING (ap_id IN (SELECT id FROM public.access_points WHERE provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())));

-- Wallet Transactions
CREATE POLICY "Admins manage all wallet txns" ON public.wallet_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own wallet txns" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Provider Earnings Ledger
CREATE POLICY "Admins view all earnings" ON public.provider_earnings_ledger FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Providers view own earnings" ON public.provider_earnings_ledger FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

-- Provider Wallets
CREATE POLICY "Admins view all provider wallets" ON public.provider_wallets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Providers view own wallet" ON public.provider_wallets FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

-- Gift Credits
CREATE POLICY "Admins manage gift credits" ON public.gift_credits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own gift credits" ON public.gift_credits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Referral Events
CREATE POLICY "Admins view all referrals" ON public.referral_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own referrals" ON public.referral_events FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Notifications
CREATE POLICY "Admins manage all notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Device Tokens
CREATE POLICY "Users manage own tokens" ON public.device_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- AP Health Log
CREATE POLICY "Admins view AP health" ON public.ap_health_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Providers view own AP health" ON public.ap_health_log FOR SELECT TO authenticated
  USING (ap_id IN (SELECT id FROM public.access_points WHERE provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())));

-- Admin Audit Log
CREATE POLICY "Admins view audit log" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert audit log" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== DATABASE FUNCTIONS ==========

-- Get dashboard stats for admin KPIs
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'active_bundles', (SELECT COUNT(*) FROM public.user_bundles WHERE status = 'active'),
    'active_sessions', (SELECT COUNT(*) FROM public.session_segments WHERE status = 'active'),
    'total_gmv_xaf', COALESCE((SELECT SUM(amount_xaf) FROM public.wallet_transactions WHERE type = 'debit' AND status = 'confirmed'), 0),
    'platform_revenue_xaf', COALESCE((SELECT SUM(platform_fee_xaf) FROM public.provider_earnings_ledger), 0),
    'total_providers', (SELECT COUNT(*) FROM public.providers WHERE kyc_status = 'approved'),
    'total_access_points', (SELECT COUNT(*) FROM public.access_points),
    'online_access_points', (SELECT COUNT(*) FROM public.access_points WHERE status = 'online')
  ) INTO result;
  RETURN result;
END;
$$;

-- ========== VIEWS ==========

CREATE OR REPLACE VIEW public.v_sessions_by_zone AS
SELECT
  ap.zone_label,
  ap.id AS ap_id,
  COUNT(ss.id) AS total_sessions,
  COUNT(ss.id) FILTER (WHERE ss.status = 'active') AS active_sessions,
  COALESCE(SUM(ss.time_used_minutes), 0) AS total_minutes_used
FROM public.access_points ap
LEFT JOIN public.session_segments ss ON ss.ap_id = ap.id
GROUP BY ap.zone_label, ap.id;

CREATE OR REPLACE VIEW public.v_provider_earnings_summary AS
SELECT
  p.id AS provider_id,
  p.business_name,
  p.user_id,
  COUNT(pel.id) AS total_segments,
  COALESCE(SUM(pel.gross_xaf), 0) AS total_gross_xaf,
  COALESCE(SUM(pel.platform_fee_xaf), 0) AS total_fees_xaf,
  COALESCE(SUM(pel.net_xaf), 0) AS total_net_xaf,
  COALESCE(pw.balance_xaf, 0) AS current_balance_xaf
FROM public.providers p
LEFT JOIN public.provider_earnings_ledger pel ON pel.provider_id = p.id
LEFT JOIN public.provider_wallets pw ON pw.provider_id = p.id
GROUP BY p.id, p.business_name, p.user_id, pw.balance_xaf;
