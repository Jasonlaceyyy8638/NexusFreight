CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.carriers (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  license_number text,
  status text NOT NULL DEFAULT 'off_duty' CHECK (status IN ('off_duty', 'available', 'en_route', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX drivers_org_id_idx ON public.drivers (org_id);
CREATE INDEX drivers_carrier_id_idx ON public.drivers (carrier_id);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_all_same_org"
  ON public.drivers
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
