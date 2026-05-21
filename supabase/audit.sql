-- ============================================================================
-- Konnectik — Audit complet pour valider que l'app mobile peut tourner.
-- Exécuter dans Supabase Dashboard > SQL Editor (un bloc à la fois).
-- Copie/colle les résultats pour Claude.
-- ============================================================================

-- 1) ENUMS — confirmer les valeurs autorisées
-- ============================================================================
SELECT
  t.typname AS enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname IN (
    'ap_status', 'ap_health_status', 'segment_status', 'bundle_status',
    'session_type', 'wallet_tx_status', 'wallet_tx_type',
    'notification_category', 'app_role', 'kyc_status',
    'device_platform', 'gift_credit_type', 'referral_event_type'
  )
GROUP BY t.typname
ORDER BY t.typname;


-- 2) RLS — quelles tables ont RLS activée ?
-- ============================================================================
SELECT
  c.relname AS tablename,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relrowsecurity DESC, c.relname;


-- 3) RLS — lister TOUTES les policies existantes
-- ============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;


-- 4) TRIGGERS — particulièrement sur auth.users (création auto du profile)
-- ============================================================================
SELECT
  event_object_schema AS schema,
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS event,
  action_timing AS timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema IN ('auth', 'public')
ORDER BY event_object_schema, event_object_table, trigger_name;


-- 5) FONCTIONS DB pertinentes (handle_new_user, génération referral, etc.)
-- ============================================================================
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'pg_%'
ORDER BY p.proname;


-- 6) Edge functions déployées (depuis les secrets Vault — sinon vide)
-- ============================================================================
-- (Si tu as accès à la console Supabase, le menu Edge Functions liste tout.
--  Ici on regarde juste la table d'audit interne si elle existe.)
SELECT
  to_regclass('public.admin_audit_log') IS NOT NULL AS audit_log_exists,
  to_regclass('public.profiles') IS NOT NULL AS profiles_exists,
  to_regclass('public.user_roles') IS NOT NULL AS user_roles_exists;


-- 7) ÉCHANTILLON de données — y a-t-il déjà du contenu pour tester ?
-- ============================================================================
SELECT 'bundles_active' AS dataset, count(*) AS n FROM bundles WHERE is_active = true
UNION ALL
SELECT 'access_points_online', count(*) FROM access_points WHERE status = 'online'
UNION ALL
SELECT 'profiles_total', count(*) FROM profiles
UNION ALL
SELECT 'providers_total', count(*) FROM providers;


-- 8) Vérifier qu'un profile est créé par DEFAULT au signup
-- (compare auth.users vs profiles — si décalage, le trigger manque ou échoue)
-- ============================================================================
SELECT
  (SELECT count(*) FROM auth.users) AS auth_users,
  (SELECT count(*) FROM public.profiles) AS profiles,
  (SELECT count(*) FROM auth.users) - (SELECT count(*) FROM public.profiles) AS missing_profiles;
