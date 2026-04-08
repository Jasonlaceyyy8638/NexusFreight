-- Dispatcher / agency orgs may have NULL mc_number and dot_number; RLS must not depend on them.
-- Membership is: profiles.org_id = organizations.id for the signed-in user.

DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations;

CREATE POLICY "organizations_select_member"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.org_id IS NOT NULL
        AND p.org_id = organizations.id
    )
  );

COMMENT ON POLICY "organizations_select_member" ON public.organizations IS
  'Tenant members read their org row by profiles.org_id; FMCSA columns optional.';
