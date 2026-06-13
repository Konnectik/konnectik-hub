-- =============================================
-- PHASE 12: Payout requests table + provider wallet integration
-- Run this SQL in your Supabase SQL Editor
-- =============================================
--
-- Adds a persistent payout_requests log so providers (and admins) can audit
-- every payout: who, how much, what method, what status, when. Without this,
-- the process-payout edge function had no trace beyond the wallet_transactions
-- row, and we couldn't show a real "Payout Requests" tab in ProviderDashboard.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE public.payout_status AS ENUM (
      'pending', 'processing', 'completed', 'failed', 'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_xaf BIGINT NOT NULL CHECK (amount_xaf > 0),
  fee_xaf BIGINT NOT NULL DEFAULT 0,
  net_xaf BIGINT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('momo', 'om', 'bank')),
  phone_number TEXT,
  status public.payout_status NOT NULL DEFAULT 'pending',
  reference TEXT UNIQUE NOT NULL,
  aggregator_ref TEXT,
  error_message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_provider ON public.payout_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_requested_at ON public.payout_requests(requested_at DESC);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all payouts"
  ON public.payout_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers view own payouts"
  ON public.payout_requests FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.touch_payout_requests()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS payout_requests_updated_at ON public.payout_requests;
CREATE TRIGGER payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_payout_requests();
