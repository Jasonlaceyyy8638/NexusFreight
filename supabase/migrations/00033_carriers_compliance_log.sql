ALTER TABLE public.carriers
  ADD COLUMN IF NOT EXISTS compliance_log text;

COMMENT ON COLUMN public.carriers.compliance_log IS 'Audit trail from nightly FMCSA check (e.g. auto-deactivation note)';
