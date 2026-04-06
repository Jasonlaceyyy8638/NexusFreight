CREATE TABLE public.trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.carriers (id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  vin text,
  license_plate text,
  eld_external_id text,
  last_lat double precision,
  last_lng double precision,
  last_ping_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trucks_org_id_idx ON public.trucks (org_id);
CREATE INDEX trucks_carrier_id_idx ON public.trucks (carrier_id);

ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trucks_all_same_org"
  ON public.trucks
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
