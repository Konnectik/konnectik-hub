-- =============================================
-- PHASE 9: Drop Legacy wifi_zones & routers Tables
-- Run AFTER confirming all UI/code uses access_points
-- =============================================

-- 1. Drop dependent policies first
DROP POLICY IF EXISTS "Admins can manage all routers" ON public.routers;
DROP POLICY IF EXISTS "Owners can view own routers" ON public.routers;
DROP POLICY IF EXISTS "Owners can insert routers in own zones" ON public.routers;

DROP POLICY IF EXISTS "Admins can manage all zones" ON public.wifi_zones;
DROP POLICY IF EXISTS "Owners can view own zones" ON public.wifi_zones;
DROP POLICY IF EXISTS "Owners can insert own zones" ON public.wifi_zones;
DROP POLICY IF EXISTS "Owners can update own zones" ON public.wifi_zones;

-- 2. Drop triggers
DROP TRIGGER IF EXISTS routers_updated_at ON public.routers;
DROP TRIGGER IF EXISTS wifi_zones_updated_at ON public.wifi_zones;

-- 3. Drop tables (routers first due to FK dependency)
DROP TABLE IF EXISTS public.routers;
DROP TABLE IF EXISTS public.wifi_zones;
