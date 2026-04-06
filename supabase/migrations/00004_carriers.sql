-- Client carriers / MCs managed within an organization (e.g. agency dispatchers)
CREATE TABLE public.carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name text NOT NULL,
  mc_number text,
  fee_percent numeric(5, 2) NOT NULL DEFAULT 10.00,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX carriers_org_id_idx ON public.carriers (org_id);

ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carriers_all_same_org"
  ON public.carriers
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
