CREATE TABLE public.eld_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.carriers (id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('samsara', 'motive', 'geotab')),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  external_account_id text,
  scopes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (carrier_id, provider)
);

CREATE INDEX eld_connections_org_id_idx ON public.eld_connections (org_id);
CREATE INDEX eld_connections_carrier_id_idx ON public.eld_connections (carrier_id);

ALTER TABLE public.eld_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eld_connections_all_same_org"
  ON public.eld_connections
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );
