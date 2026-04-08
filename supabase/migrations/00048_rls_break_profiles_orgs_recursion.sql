-- PostgREST can return 500 on /profiles when RLS policies on profiles and organizations
-- reference each other (infinite recursion). Use SECURITY DEFINER helpers that read
-- profiles without re-entering RLS. See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.user_is_org_member(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.org_id IS NOT NULL
      AND p.org_id = check_org_id
  );
$$;

REVOKE ALL ON FUNCTION public.user_is_org_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_org_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "profiles_select_same_org" ON public.profiles;
CREATE POLICY "profiles_select_same_org"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    org_id IS NOT NULL
    AND org_id = public.current_user_org_id()
  );

DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations;
CREATE POLICY "organizations_select_member"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (public.user_is_org_member(id));

COMMENT ON FUNCTION public.current_user_org_id() IS
  'RLS-safe: caller org_id without recursive policy checks.';
COMMENT ON FUNCTION public.user_is_org_member(uuid) IS
  'RLS-safe: true if auth.uid() profile is linked to check_org_id.';
