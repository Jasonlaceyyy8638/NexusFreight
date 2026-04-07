-- Founding-member welcome email: profile insert (is_beta_user) queues async HTTP via pg_net
-- to Next.js POST /api/internal/welcome-email (Resend).
--
-- After deploy, in Supabase SQL Editor (one-time):
--   1. Set WELCOME_EMAIL_WEBHOOK_SECRET in your Next.js host to a long random value.
--   2. INSERT INTO private.welcome_webhook_config (id, endpoint_url, bearer_secret)
--      VALUES (
--        1,
--        'https://YOUR_DOMAIN/api/internal/welcome-email',
--        'THE_SAME_SECRET_AS_WELCOME_EMAIL_WEBHOOK_SECRET'
--      )
--      ON CONFLICT (id) DO UPDATE SET
--        endpoint_url = EXCLUDED.endpoint_url,
--        bearer_secret = EXCLUDED.bearer_secret,
--        updated_at = now();
--   3. Enable extension "pg_net" in Dashboard → Database → Extensions if this migration
--      did not enable it (requires restart on self-hosted).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.welcome_webhook_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  endpoint_url text NOT NULL,
  bearer_secret text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE private.welcome_webhook_config IS
  'Single row: full HTTPS URL to POST /api/internal/welcome-email and shared Bearer secret (matches WELCOME_EMAIL_WEBHOOK_SECRET).';

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON TABLE private.welcome_webhook_config FROM PUBLIC;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

COMMENT ON COLUMN public.profiles.welcome_email_sent_at IS
  'When the founding-member welcome email was sent via Resend (idempotent).';

CREATE OR REPLACE FUNCTION public.notify_founding_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_url text;
  v_secret text;
BEGIN
  IF NEW.is_beta_user IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = NEW.id LIMIT 1;
  IF v_email IS NULL OR length(trim(v_email)) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT c.endpoint_url::text, c.bearer_secret::text
    INTO v_url, v_secret
  FROM private.welcome_webhook_config c
  WHERE c.id = 1
  LIMIT 1;

  IF v_url IS NULL OR v_secret IS NULL OR length(trim(v_url)) = 0 OR length(trim(v_secret)) = 0 THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := trim(v_url),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    body := jsonb_build_object(
      'userId', NEW.id::text,
      'email', v_email,
      'fullName', COALESCE(
        NULLIF(trim(NEW.full_name), ''),
        split_part(v_email, '@', 1)
      )
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_notify_founding_welcome ON public.profiles;

CREATE TRIGGER profiles_notify_founding_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_founding_welcome_email();
