-- Driver roster profiles (fleet/agency invites) must not consume founding-member beta slots
-- or overwrite trial fields; 00051 restored the cap logic but dropped the Driver skip from 00042.

CREATE OR REPLACE FUNCTION public.set_profile_trial_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing integer;
BEGIN
  IF NEW.role = 'Driver' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::integer INTO existing FROM public.profiles;
  IF existing < 5 THEN
    NEW.is_beta_user := true;
    NEW.trial_type := 'BETA';
    NEW.trial_ends_at := (timezone('utc', now())) + interval '45 days';
  ELSE
    NEW.is_beta_user := false;
    NEW.trial_type := 'TRIAL';
    NEW.trial_ends_at := (timezone('utc', now())) + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.is_beta_user IS
  'True for first 5 non-driver signups (Founding Member). Driver-role roster joins skip this trigger body.';
