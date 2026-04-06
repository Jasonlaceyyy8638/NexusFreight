-- Allow users with admin_access (not only DB role Admin) to manage permission rows.
DROP POLICY IF EXISTS "user_permissions_update_admin" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_insert_admin" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_delete_admin" ON public.user_permissions;

CREATE POLICY "user_permissions_insert_elevated"
  ON public.user_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p2
        WHERE p2.id = auth.uid() AND p2.role = 'Admin'
      )
      OR EXISTS (
        SELECT 1 FROM public.user_permissions self
        WHERE self.profile_id = auth.uid() AND self.admin_access = true
      )
    )
  );

CREATE POLICY "user_permissions_update_elevated"
  ON public.user_permissions
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p2
        WHERE p2.id = auth.uid() AND p2.role = 'Admin'
      )
      OR EXISTS (
        SELECT 1 FROM public.user_permissions self
        WHERE self.profile_id = auth.uid() AND self.admin_access = true
      )
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "user_permissions_delete_elevated"
  ON public.user_permissions
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p2
        WHERE p2.id = auth.uid() AND p2.role = 'Admin'
      )
      OR EXISTS (
        SELECT 1 FROM public.user_permissions self
        WHERE self.profile_id = auth.uid() AND self.admin_access = true
      )
    )
  );

DROP POLICY IF EXISTS "pending_invites_write_admin" ON public.pending_team_invites;

CREATE POLICY "pending_invites_write_elevated"
  ON public.pending_team_invites
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p2
        WHERE p2.id = auth.uid() AND p2.role = 'Admin'
      )
      OR EXISTS (
        SELECT 1 FROM public.user_permissions self
        WHERE self.profile_id = auth.uid() AND self.admin_access = true
      )
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );
