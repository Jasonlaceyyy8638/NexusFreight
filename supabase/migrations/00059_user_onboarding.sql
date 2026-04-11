-- Per-user getting-started checklist (agency dispatchers).

CREATE TABLE public.user_onboarding (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  profile_completed boolean NOT NULL DEFAULT false,
  carrier_added boolean NOT NULL DEFAULT false,
  document_uploaded boolean NOT NULL DEFAULT false,
  packet_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_onboarding_updated_at_idx ON public.user_onboarding (updated_at DESC);

COMMENT ON TABLE public.user_onboarding IS
  'Interactive onboarding checklist; packet_generated stays true once set. Other flags sync from workspace state.';

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_onboarding_select_own"
  ON public.user_onboarding
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_onboarding_insert_own"
  ON public.user_onboarding
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_onboarding_update_own"
  ON public.user_onboarding
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_user_onboarding_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW
  EXECUTE PROCEDURE public.touch_user_onboarding_updated_at();

INSERT INTO public.user_onboarding (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_user_onboarding_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_onboarding (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_ensure_user_onboarding
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.ensure_user_onboarding_row();
