-- Email-to-SMS gateway carrier (host only, e.g. vtext.com)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS phone_carrier text;

ALTER TABLE public.carriers
  ADD COLUMN IF NOT EXISTS phone_carrier text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_carrier text;

COMMENT ON COLUMN public.drivers.phone_carrier IS 'Wireless SMS gateway domain (e.g. vtext.com) for dispatch email-to-SMS.';
COMMENT ON COLUMN public.carriers.phone_carrier IS 'Wireless SMS gateway domain for carrier contact mobile, if used.';
COMMENT ON COLUMN public.profiles.phone_carrier IS 'Wireless SMS gateway domain for dispatcher profile mobile (profiles.phone).';
