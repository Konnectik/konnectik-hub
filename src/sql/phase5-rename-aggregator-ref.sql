-- Phase 5: Rename mansar_ref → aggregator_ref (provider-agnostic)
-- Run this in Supabase SQL Editor

ALTER TABLE public.wallet_transactions
  RENAME COLUMN mansar_ref TO aggregator_ref;

COMMENT ON COLUMN public.wallet_transactions.aggregator_ref IS 'Payment aggregator transaction ID (Netwallet TransactionId)';
