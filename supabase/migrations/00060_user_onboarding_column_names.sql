-- Align user_onboarding column names with app (Nexus Launchpad).

ALTER TABLE public.user_onboarding
  RENAME COLUMN profile_completed TO profile_done;

ALTER TABLE public.user_onboarding
  RENAME COLUMN document_uploaded TO doc_uploaded;

ALTER TABLE public.user_onboarding
  RENAME COLUMN packet_generated TO packet_ready;

COMMENT ON TABLE public.user_onboarding IS
  'Nexus Launchpad checklist; packet_ready stays true once set. Other flags sync from workspace.';
