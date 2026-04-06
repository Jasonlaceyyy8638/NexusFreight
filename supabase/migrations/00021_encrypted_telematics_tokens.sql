-- Server-side encrypted ELD / telematics API tokens (written only via Next.js API + service role).
-- Clients never read ciphertext; use application APIs.

CREATE TABLE public.encrypted_telematics_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.carriers (id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('samsara', 'motive', 'geotab')),
  ciphertext text NOT NULL,
  iv text NOT NULL,
  auth_tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (carrier_id, provider)
);

CREATE INDEX encrypted_telematics_tokens_org_idx
  ON public.encrypted_telematics_tokens (org_id);
CREATE INDEX encrypted_telematics_tokens_carrier_idx
  ON public.encrypted_telematics_tokens (carrier_id);

ALTER TABLE public.encrypted_telematics_tokens ENABLE ROW LEVEL SECURITY;

-- No direct access for authenticated users; Next.js uses service role for reads/writes.
