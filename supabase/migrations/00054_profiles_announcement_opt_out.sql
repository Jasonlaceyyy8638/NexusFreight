-- Product / marketing announcement emails: allow users to opt out from profile.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS announcement_emails_opt_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.announcement_emails_opt_out IS
  'When true, user is excluded from bulk product announcement emails (auth_email on profile).';
