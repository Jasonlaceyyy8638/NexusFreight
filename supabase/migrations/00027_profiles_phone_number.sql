-- Dispatcher callback number for SMS templates (preferred over legacy `phone` when set)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text;

UPDATE public.profiles
SET phone_number = phone
WHERE phone_number IS NULL
  AND phone IS NOT NULL
  AND btrim(phone) <> '';

COMMENT ON COLUMN public.profiles.phone_number IS 'Dispatcher mobile for load SMS/email-to-SMS callbacks; used to replace {{dispatcher_phone}} in templates.';
