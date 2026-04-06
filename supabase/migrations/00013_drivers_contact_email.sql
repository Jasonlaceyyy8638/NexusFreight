ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS contact_email text;

COMMENT ON COLUMN public.drivers.contact_email IS 'Optional email for rate con / document delivery';
