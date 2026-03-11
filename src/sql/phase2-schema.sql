-- =============================================
-- PHASE 2: Wi-Fi Zones, Routers, Bundles, Transactions
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- 1. Wi-Fi Zones table
CREATE TABLE public.wifi_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  radius INTEGER NOT NULL DEFAULT 100,
  bandwidth INTEGER NOT NULL DEFAULT 300,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.wifi_zones ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER wifi_zones_updated_at
  BEFORE UPDATE ON public.wifi_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Routers table
CREATE TABLE public.routers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.wifi_zones(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Offline' CHECK (status IN ('Online', 'Offline')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.routers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER routers_updated_at
  BEFORE UPDATE ON public.routers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Bundles (plans) table
CREATE TABLE public.bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  duration_unit TEXT NOT NULL DEFAULT 'Hours' CHECK (duration_unit IN ('Hours', 'Days', 'Weeks')),
  price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XAF',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER bundles_updated_at
  BEFORE UPDATE ON public.bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES public.wifi_zones(id) ON DELETE SET NULL,
  bundle_id UUID REFERENCES public.bundles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  bundle_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XAF',
  type TEXT NOT NULL DEFAULT 'credit' CHECK (type IN ('credit', 'withdrawal')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Completed', 'Pending', 'Failed')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Wi-Fi Zones: Admins see all, owners see own
CREATE POLICY "Admins can manage all zones"
  ON public.wifi_zones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can view own zones"
  ON public.wifi_zones FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert own zones"
  ON public.wifi_zones FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own zones"
  ON public.wifi_zones FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Routers: Admins see all, owners see routers in their zones
CREATE POLICY "Admins can manage all routers"
  ON public.routers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can view own routers"
  ON public.routers FOR SELECT
  TO authenticated
  USING (zone_id IN (SELECT id FROM public.wifi_zones WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can insert routers in own zones"
  ON public.routers FOR INSERT
  TO authenticated
  WITH CHECK (zone_id IN (SELECT id FROM public.wifi_zones WHERE owner_id = auth.uid()));

-- Bundles: All authenticated can read, admins can manage
CREATE POLICY "Authenticated can view bundles"
  ON public.bundles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage bundles"
  ON public.bundles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Transactions: Admins see all, owners see transactions in their zones
CREATE POLICY "Admins can manage all transactions"
  ON public.transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can view own zone transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (zone_id IN (SELECT id FROM public.wifi_zones WHERE owner_id = auth.uid()));
