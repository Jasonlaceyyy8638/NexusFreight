-- Organization / fleet logo files. Paths: {org_id}/agency-logo.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org_branding',
  'org_branding',
  false,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "org_branding_select_same_org"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'org_branding'
    AND (storage.foldername(name))[1] IN (
      SELECT p.org_id::text FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "org_branding_insert_org_admin"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'org_branding'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'Admin'
        AND p.org_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "org_branding_update_org_admin"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'org_branding'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'Admin'
        AND p.org_id::text = (storage.foldername(name))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'org_branding'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'Admin'
        AND p.org_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "org_branding_delete_org_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'org_branding'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'Admin'
        AND p.org_id::text = (storage.foldername(name))[1]
    )
  );
