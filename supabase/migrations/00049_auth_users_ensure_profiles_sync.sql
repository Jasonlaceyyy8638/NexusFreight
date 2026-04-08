-- Safety net: every auth.users row gets a matching public.profiles row (and auth_email for ops).
-- Primary signup logic remains in public.handle_new_user() (trigger on_auth_user_created).
-- This trigger runs after that one (name order: "on_..." before "zzz_...") and:
--   - Inserts a minimal Admin row if none exists (e.g. primary trigger missing or failed in the past).
--   - Sets auth_email when still null so you can see the address without joining auth.users.
-- Profile role stays "Admin" for self-serve signups; "carrier" is an organizations.type, not profiles.role.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_email text;

COMMENT ON COLUMN public.profiles.auth_email IS
  'Email copied from auth.users at signup (and backfilled when missing) for admin reporting.';

CREATE OR REPLACE FUNCTION public.ensure_profile_after_auth_user_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.id) THEN
    v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone_number', '')), '');
    INSERT INTO public.profiles (id, org_id, role, full_name, phone_number, phone, auth_email)
    VALUES (
      NEW.id,
      NULL,
      'Admin',
      NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
      v_phone,
      v_phone,
      NULLIF(trim(NEW.email), '')
    );
  ELSE
    UPDATE public.profiles
    SET auth_email = COALESCE(auth_email, NULLIF(trim(NEW.email), ''))
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_profile_after_auth_user_insert() IS
  'Runs AFTER INSERT ON auth.users (after handle_new_user). Ensures profiles row + auth_email.';

DROP TRIGGER IF EXISTS zzz_ensure_profile_after_auth_user_insert ON auth.users;

CREATE TRIGGER zzz_ensure_profile_after_auth_user_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.ensure_profile_after_auth_user_insert();
