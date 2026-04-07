-- BOL / document photos from driver mobile app. Paths: {org_id}/{driver_id}/{load_or_misc}/{filename}
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver_bol', 'driver_bol', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "driver_bol_select_same_org"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'driver_bol'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "driver_bol_insert_same_org"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'driver_bol'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "driver_bol_update_same_org"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'driver_bol'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "driver_bol_delete_same_org"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'driver_bol'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );
