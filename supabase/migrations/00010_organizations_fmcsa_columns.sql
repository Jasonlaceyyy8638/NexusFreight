ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS dot_number text,
  ADD COLUMN IF NOT EXISTS mc_number text,
  ADD COLUMN IF NOT EXISTS is_active_authority boolean;

COMMENT ON COLUMN public.organizations.dot_number IS 'U.S. DOT number from FMCSA';
COMMENT ON COLUMN public.organizations.mc_number IS 'MC/MX docket from FMCSA';
COMMENT ON COLUMN public.organizations.is_active_authority IS 'FMCSA allowToOperate / not OOS';
