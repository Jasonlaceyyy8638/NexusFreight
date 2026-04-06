CREATE TABLE public.loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.carriers (id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers (id) ON DELETE SET NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  rate_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'dispatched', 'in_transit', 'delivered', 'cancelled')),
  ratecon_storage_path text,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX loads_org_id_idx ON public.loads (org_id);
CREATE INDEX loads_carrier_id_idx ON public.loads (carrier_id);
CREATE INDEX loads_driver_id_idx ON public.loads (driver_id);
CREATE INDEX loads_status_idx ON public.loads (status);

ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loads_all_same_org"
  ON public.loads
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
