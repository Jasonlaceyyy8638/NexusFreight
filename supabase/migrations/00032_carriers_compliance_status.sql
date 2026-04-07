-- Nightly FMCSA monitor: explicit compliance + human-readable alert
ALTER TABLE public.carriers
  ADD COLUMN IF NOT EXISTS compliance_alert text;

ALTER TABLE public.carriers
  ADD COLUMN IF NOT EXISTS compliance_status text;

UPDATE public.carriers
SET compliance_status = CASE
  WHEN is_active_authority = false THEN 'inactive'
  ELSE 'active'
END
WHERE compliance_status IS NULL;

ALTER TABLE public.carriers
  ALTER COLUMN compliance_status SET DEFAULT 'active';

ALTER TABLE public.carriers
  ALTER COLUMN compliance_status SET NOT NULL;

ALTER TABLE public.carriers
  DROP CONSTRAINT IF EXISTS carriers_compliance_status_check;

ALTER TABLE public.carriers
  ADD CONSTRAINT carriers_compliance_status_check
  CHECK (compliance_status IN ('active', 'inactive'));

COMMENT ON COLUMN public.carriers.compliance_status IS 'active = OK to assign loads; inactive set by FMCSA nightly monitor';
COMMENT ON COLUMN public.carriers.compliance_alert IS 'e.g. Authority Revoked/Inactive as of [date]';
