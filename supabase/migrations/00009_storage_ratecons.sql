-- Private bucket for rate confirmation documents; paths: {org_id}/{carrier_id}/{filename}
INSERT INTO storage.buckets (id, name, public)
VALUES ('ratecons', 'ratecons', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ratecons_select_same_org"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ratecons'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "ratecons_insert_same_org"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ratecons'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "ratecons_update_same_org"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ratecons'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "ratecons_delete_same_org"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ratecons'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );
