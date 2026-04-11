-- Public driver onboarding links: unique slug per organization (dispatcher agency workspace).

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS onboarding_slug text;

COMMENT ON COLUMN public.organizations.onboarding_slug IS
  'URL segment for /onboard/[slug]; public uploads attach to this org''s carrier vault.';

CREATE UNIQUE INDEX IF NOT EXISTS organizations_onboarding_slug_lower_key
  ON public.organizations (lower(trim(onboarding_slug)))
  WHERE onboarding_slug IS NOT NULL AND btrim(onboarding_slug) <> '';
