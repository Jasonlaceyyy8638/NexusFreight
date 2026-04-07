-- Extend welcome webhook: fire for founding members (is_beta_user) OR standard 7-day trial (trial_type = 'TRIAL').
-- Same endpoint: POST /api/internal/welcome-email picks the Resend template.

DROP TRIGGER IF EXISTS profiles_notify_founding_welcome ON public.profiles;

DROP FUNCTION IF EXISTS public.notify_founding_welcome_email();

CREATE OR REPLACE FUNCTION public.notify_profile_welcome_email()
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
  IF NOT (
    NEW.is_beta_user IS TRUE
    OR NEW.trial_type = 'TRIAL'
  ) THEN
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

CREATE TRIGGER profiles_notify_welcome_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_profile_welcome_email();

COMMENT ON FUNCTION public.notify_profile_welcome_email() IS
  'Queues pg_net POST to Next /api/internal/welcome-email for BETA (founding) or TRIAL profiles.';
