-- =============================================
-- PHASE 16: Enable pg_net + trigger that POSTs to send-push edge function
-- on every new notifications row.
-- Run this SQL in your Supabase SQL Editor
-- =============================================
--
-- Why this file: Supabase's "Database Webhooks" UI only shows up once pg_net
-- is enabled. We bypass the UI entirely by enabling pg_net and registering an
-- AFTER INSERT trigger on `public.notifications` that calls send-push.
--
-- Required Supabase secrets / GUC values:
--   project_url       — auto-set via app.settings, OR fall back to literal in this file.
--   service_role_key  — read from Supabase Vault (recommended) OR set as
--                       database setting `app.settings.service_role_key`.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Convenience helper: returns the project's edge function URL for `send-push`.
-- Replace the literal if you ever move projects.
CREATE OR REPLACE FUNCTION public.send_push_url()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'https://ufdzcxycgprgvigyotnk.supabase.co/functions/v1/send-push'
$$;

-- The service-role key must be stored in the Vault for security. To set it once:
--   SELECT vault.create_secret('eyJ...service_role_jwt...', 'service_role_key');
-- This trigger reads it back at runtime.
CREATE OR REPLACE FUNCTION public.dispatch_notification_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  service_key TEXT;
  body JSONB;
BEGIN
  -- Read the service-role JWT from the Vault. If it's missing, log and skip.
  SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;

  IF service_key IS NULL THEN
    RAISE NOTICE '[push] service_role_key vault secret missing — skipping push for notif %', NEW.id;
    RETURN NEW;
  END IF;

  body := jsonb_build_object(
    'record', jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.body,
      'category', NEW.category,
      'data', NEW.data
    )
  );

  PERFORM net.http_post(
    url := public.send_push_url(),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := body
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block notification inserts because push failed.
  RAISE NOTICE '[push] dispatch failed for notif %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_dispatch_push ON public.notifications;
CREATE TRIGGER notifications_dispatch_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification_push();
