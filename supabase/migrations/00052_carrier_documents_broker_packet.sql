-- Broker setup packet: one row per required document category per carrier.

CREATE TABLE public.carrier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.carriers (id) ON DELETE CASCADE,
  doc_category text NOT NULL CHECK (
    doc_category IN (
      'operating_authority',
      'w9',
      'coi',
      'safety_sms',
      'carrier_profile',
      'voided_check',
      'notice_of_assignment'
    )
  ),
  storage_path text NOT NULL,
  original_filename text,
  expiry_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (carrier_id, doc_category)
);

CREATE INDEX carrier_documents_carrier_id_idx ON public.carrier_documents (carrier_id);
CREATE INDEX carrier_documents_org_id_idx ON public.carrier_documents (org_id);

COMMENT ON TABLE public.carrier_documents IS
  'Required broker packet files per carrier; storage_path is path inside broker_packet_docs bucket.';

CREATE OR REPLACE FUNCTION public.enforce_carrier_documents_org_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.carriers c
    WHERE c.id = NEW.carrier_id
      AND c.org_id = NEW.org_id
  ) THEN
    RAISE EXCEPTION 'carrier_documents org_id must match carriers.org_id for carrier_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER carrier_documents_org_match
  BEFORE INSERT OR UPDATE OF org_id, carrier_id
  ON public.carrier_documents
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_carrier_documents_org_match();

CREATE OR REPLACE FUNCTION public.touch_carrier_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER carrier_documents_updated_at
  BEFORE UPDATE ON public.carrier_documents
  FOR EACH ROW
  EXECUTE PROCEDURE public.touch_carrier_documents_updated_at();

ALTER TABLE public.carrier_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carrier_documents_select_same_org"
  ON public.carrier_documents
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "carrier_documents_insert_same_org"
  ON public.carrier_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "carrier_documents_update_same_org"
  ON public.carrier_documents
  FOR UPDATE
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

CREATE POLICY "carrier_documents_delete_same_org"
  ON public.carrier_documents
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('broker_packet_docs', 'broker_packet_docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "broker_packet_docs_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'broker_packet_docs'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "broker_packet_docs_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'broker_packet_docs'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "broker_packet_docs_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'broker_packet_docs'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "broker_packet_docs_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'broker_packet_docs'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );
