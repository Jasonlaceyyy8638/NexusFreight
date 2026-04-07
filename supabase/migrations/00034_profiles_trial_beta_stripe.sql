-- Trial / founding beta (first 5 profiles) + optional Stripe subscription
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_type text,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_beta_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_trial_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_trial_type_check
  CHECK (trial_type IS NULL OR trial_type IN ('BETA', 'TRIAL'));

COMMENT ON COLUMN public.profiles.trial_type IS 'BETA = founding 45d no card; TRIAL = standard 7d';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Full dashboard access until this instant (UTC)';
COMMENT ON COLUMN public.profiles.is_beta_user IS 'True for first 5 signups (Founding Member)';
COMMENT ON COLUMN public.profiles.stripe_subscription_id IS 'Set after successful Checkout; bypasses trial gate';

-- First 5 inserts (by time of insert): BETA + 45d. Rest: TRIAL + 7d.
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

DROP TRIGGER IF EXISTS profiles_set_trial_before_insert ON public.profiles;
CREATE TRIGGER profiles_set_trial_before_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.trial_ends_at IS NULL AND NEW.trial_type IS NULL)
  EXECUTE PROCEDURE public.set_profile_trial_on_insert();

-- Backfill existing rows (by account age) — only where not set
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.profiles
  WHERE trial_ends_at IS NULL
)
UPDATE public.profiles p
SET
  is_beta_user = (r.rn <= 5),
  trial_type = CASE WHEN r.rn <= 5 THEN 'BETA' ELSE 'TRIAL' END,
  trial_ends_at = CASE
    WHEN r.rn <= 5 THEN (timezone('utc', now()) + interval '45 days')
    ELSE (timezone('utc', now()) + interval '7 days')
  END
FROM ranked r
WHERE p.id = r.id;
