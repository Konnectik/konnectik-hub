-- =============================================
-- PHASE 10: WireGuard Tunnel Self-Provisioning
-- Adds tunnel columns to access_points + IP allocation table
-- =============================================

-- 1. Extend access_points
ALTER TABLE public.access_points
  ADD COLUMN IF NOT EXISTS wg_public_key            TEXT,
  ADD COLUMN IF NOT EXISTS wg_private_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS tunnel_ip                TEXT,
  ADD COLUMN IF NOT EXISTS tunnel_status            TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tunnel_last_seen         TIMESTAMPTZ;

-- Add CHECK constraint (drop first in case of re-run)
ALTER TABLE public.access_points
  DROP CONSTRAINT IF EXISTS access_points_tunnel_status_check;
ALTER TABLE public.access_points
  ADD CONSTRAINT access_points_tunnel_status_check
  CHECK (tunnel_status IN ('pending','connected','disconnected'));

-- 2. Tunnel IP allocation table
CREATE TABLE IF NOT EXISTS public.tunnel_ip_assignments (
  ip          TEXT PRIMARY KEY,
  ap_id       UUID REFERENCES public.access_points(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now()
);

-- Reserve VPS server IP
INSERT INTO public.tunnel_ip_assignments (ip, ap_id)
VALUES ('10.0.0.1', NULL)
ON CONFLICT (ip) DO NOTHING;

-- 3. RLS — service_role only
ALTER TABLE public.tunnel_ip_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.tunnel_ip_assignments;
CREATE POLICY "service_role full access"
  ON public.tunnel_ip_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- (No policies for authenticated/anon → no read or write access)

-- 4. Realtime on access_points (so the Step 2 status indicator works)
ALTER TABLE public.access_points REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'access_points'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.access_points';
  END IF;
END $$;
