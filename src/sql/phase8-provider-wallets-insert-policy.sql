-- =============================================
-- PHASE 8: Allow admins to insert provider wallets
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- Allow admins to insert into provider_wallets (needed when manually creating providers)
CREATE POLICY "Admins insert provider wallets"
  ON public.provider_wallets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Also allow admins to update provider wallets (for balance adjustments)
CREATE POLICY "Admins update provider wallets"
  ON public.provider_wallets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
