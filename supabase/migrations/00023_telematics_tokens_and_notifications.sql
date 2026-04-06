-- Unified telematics vault + in-app notifications for ELD events.

ALTER TABLE public.eld_connect_invites
  ADD COLUMN IF NOT EXISTS requester_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE TABLE public.dashboard_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  kind text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dashboard_notifications_profile_created_idx
  ON public.dashboard_notifications (profile_id, created_at DESC);

ALTER TABLE public.dashboard_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_notifications_select_own"
  ON public.dashboard_notifications
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "dashboard_notifications_update_own"
  ON public.dashboard_notifications
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE TABLE public.telematics_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.carriers (id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('motive', 'samsara', 'geotab')),
  ciphertext text NOT NULL,
  iv text NOT NULL,
  auth_tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (carrier_id, provider_type)
);

CREATE INDEX telematics_tokens_org_idx ON public.telematics_tokens (org_id);
CREATE INDEX telematics_tokens_carrier_idx ON public.telematics_tokens (carrier_id);

ALTER TABLE public.telematics_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO public.telematics_tokens (
  org_id,
  carrier_id,
  provider_type,
  ciphertext,
  iv,
  auth_tag,
  created_at,
  updated_at
)
SELECT
  org_id,
  carrier_id,
  provider,
  ciphertext,
  iv,
  auth_tag,
  created_at,
  updated_at
FROM public.encrypted_telematics_tokens;

DROP TABLE public.encrypted_telematics_tokens;
