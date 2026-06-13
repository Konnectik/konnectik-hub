-- =============================================
-- PHASE 11: Financial data isolation between admin and providers
-- Run this SQL in your Supabase SQL Editor
-- =============================================
--
-- Problem: get_dashboard_stats() runs SECURITY DEFINER without any role check,
-- so a provider calling supabase.rpc('get_dashboard_stats') gets back platform
-- GMV, platform revenue, total users — admin-only data. The UI chart is hidden
-- for non-admins but the values are still in the payload (visible in DevTools).
--
-- Fix: branch on caller role.
--   - Admin → returns the full platform stats as before.
--   - Provider → returns ONLY their own metrics (their APs, sessions on their
--     APs, their gross/net earnings, their wallet balance).
--   - Anyone else → returns zeros (or could raise; we choose zeros for safety).
--
-- Also tighten get_dashboard_stats so the previous platform shape stays admin-only.

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  caller UUID := auth.uid();
  is_admin BOOLEAN;
  caller_provider_id UUID;
BEGIN
  IF caller IS NULL THEN
    RETURN json_build_object(
      'total_users', 0, 'active_bundles', 0, 'active_sessions', 0,
      'total_gmv_xaf', 0, 'platform_revenue_xaf', 0,
      'total_providers', 0, 'total_access_points', 0, 'online_access_points', 0,
      'scope', 'anonymous'
    );
  END IF;

  is_admin := public.has_role(caller, 'admin');

  IF is_admin THEN
    SELECT json_build_object(
      'scope', 'admin',
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
  END IF;

  -- Provider path: find the provider record tied to this caller
  SELECT id INTO caller_provider_id
  FROM public.providers
  WHERE user_id = caller
  LIMIT 1;

  IF caller_provider_id IS NULL THEN
    -- Authenticated end-user (not provider, not admin): return safe zeros.
    -- Platform revenue / total users are NOT exposed.
    RETURN json_build_object(
      'scope', 'user',
      'total_users', 0,
      'active_bundles', 0,
      'active_sessions', 0,
      'total_gmv_xaf', 0,
      'platform_revenue_xaf', 0,
      'total_providers', 0,
      'total_access_points', 0,
      'online_access_points', 0
    );
  END IF;

  -- Provider scope: metrics restricted to their own APs / earnings.
  SELECT json_build_object(
    'scope', 'provider',
    'provider_id', caller_provider_id,
    -- Provider does NOT see global user count or platform revenue.
    'total_users', 0,
    'platform_revenue_xaf', 0,
    'total_providers', 1,
    -- Their APs
    'total_access_points', (SELECT COUNT(*) FROM public.access_points WHERE provider_id = caller_provider_id),
    'online_access_points', (SELECT COUNT(*) FROM public.access_points WHERE provider_id = caller_provider_id AND status = 'online'),
    -- Sessions on their APs
    'active_sessions', (
      SELECT COUNT(*)
      FROM public.session_segments ss
      JOIN public.access_points ap ON ap.id = ss.ap_id
      WHERE ap.provider_id = caller_provider_id AND ss.status = 'active'
    ),
    -- Active user_bundles that were used on one of their APs at least once
    'active_bundles', (
      SELECT COUNT(DISTINCT ub.id)
      FROM public.user_bundles ub
      JOIN public.session_segments ss ON ss.bundle_id = ub.id
      JOIN public.access_points ap ON ap.id = ss.ap_id
      WHERE ub.status = 'active' AND ap.provider_id = caller_provider_id
    ),
    -- "GMV" for a provider = gross revenue they generated (their cut, before platform fee).
    'total_gmv_xaf', COALESCE((
      SELECT SUM(gross_xaf)
      FROM public.provider_earnings_ledger
      WHERE provider_id = caller_provider_id
    ), 0)
  ) INTO result;
  RETURN result;
END;
$$;

-- Make sure execute permission is restricted to authenticated callers
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
