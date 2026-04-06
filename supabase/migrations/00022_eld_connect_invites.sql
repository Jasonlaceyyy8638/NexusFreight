-- Magic-link ELD authorization (dispatcher → carrier). Service role + API routes only.

ALTER TABLE public.carriers
  ADD COLUMN IF NOT EXISTS eld_handshake_completed_at timestamptz;

COMMENT ON COLUMN public.carriers.eld_handshake_completed_at IS
  'Set when carrier completes ELD connect via magic link; dispatcher live map uses this gate.';

CREATE TABLE public.eld_connect_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.carriers (id) ON DELETE CASCADE,
  agency_org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  requester_email text NOT NULL,
  carrier_email text NOT NULL,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX eld_connect_invites_carrier_idx ON public.eld_connect_invites (carrier_id);
CREATE INDEX eld_connect_invites_expires_idx ON public.eld_connect_invites (expires_at);

ALTER TABLE public.eld_connect_invites ENABLE ROW LEVEL SECURITY;
