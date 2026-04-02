-- =============================================
-- PHASE 6: Secure views + provider payout tracking
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- 1. Recreate views with security_invoker to respect RLS
DROP VIEW IF EXISTS public.v_sessions_by_zone;
CREATE VIEW public.v_sessions_by_zone
WITH (security_invoker = on) AS
SELECT
  ap.zone_label,
  ap.id AS ap_id,
  COUNT(ss.id) AS total_sessions,
  COUNT(ss.id) FILTER (WHERE ss.status = 'active') AS active_sessions,
  COALESCE(SUM(ss.time_used_minutes), 0) AS total_minutes_used
FROM public.access_points ap
LEFT JOIN public.session_segments ss ON ss.ap_id = ap.id
GROUP BY ap.zone_label, ap.id;

DROP VIEW IF EXISTS public.v_provider_earnings_summary;
CREATE VIEW public.v_provider_earnings_summary
WITH (security_invoker = on) AS
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
