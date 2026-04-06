-- Links Supabase Auth users to an organization and role
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Admin', 'Dispatcher', 'Driver')),
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_org_id_idx ON public.profiles (org_id);
CREATE INDEX profiles_role_idx ON public.profiles (role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_same_org"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "profiles_insert_self"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_self_or_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      org_id IN (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles p2
        WHERE p2.id = auth.uid() AND p2.role = 'Admin'
      )
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );
