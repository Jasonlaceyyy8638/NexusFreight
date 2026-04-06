ALTER TABLE public.carriers
  ADD COLUMN IF NOT EXISTS dot_number text,
  ADD COLUMN IF NOT EXISTS is_active_authority boolean;

COMMENT ON COLUMN public.carriers.dot_number IS 'U.S. DOT number from FMCSA';
COMMENT ON COLUMN public.carriers.is_active_authority IS 'FMCSA authority active at last verification';
