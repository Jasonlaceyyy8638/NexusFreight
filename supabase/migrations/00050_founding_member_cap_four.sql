-- Reduce founding-member cap from 5 to 4 (45-day founding trial for first 4 profiles only).

CREATE OR REPLACE FUNCTION public.set_profile_trial_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing integer;
BEGIN
  SELECT COUNT(*)::integer INTO existing FROM public.profiles;
  IF existing < 4 THEN
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

COMMENT ON COLUMN public.profiles.is_beta_user IS 'True for first 4 signups (Founding Member)';
