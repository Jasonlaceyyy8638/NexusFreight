-- FMCSA common authority status date + vetting flag (set from QCMobile sync / add-carrier flow)
ALTER TABLE public.carriers
  ADD COLUMN IF NOT EXISTS authority_date date,
  ADD COLUMN IF NOT EXISTS is_new_authority boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.carriers.authority_date IS 'Date FMCSA reports common authority became active (commonAuthorityStatusDate / authDate)';
COMMENT ON COLUMN public.carriers.is_new_authority IS 'True when authority_date is within the last 90 days at last FMCSA capture';
