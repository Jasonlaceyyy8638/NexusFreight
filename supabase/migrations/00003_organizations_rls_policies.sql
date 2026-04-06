-- Policies reference profiles; applied after profiles exist
CREATE POLICY "organizations_select_member"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "organizations_update_admin"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT p.org_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'Admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT p.org_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'Admin'
    )
  );
