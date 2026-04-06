-- Granular UI permissions per dashboard user (profile = auth user)
CREATE TABLE public.user_permissions (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  can_view_financials boolean NOT NULL DEFAULT false,
  can_dispatch_loads boolean NOT NULL DEFAULT false,
  can_edit_fleet boolean NOT NULL DEFAULT false,
  admin_access boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_permissions_org_id_idx ON public.user_permissions (org_id);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_permissions_select_same_org"
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "user_permissions_insert_admin"
  ON public.user_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'Admin'
    )
  );

CREATE POLICY "user_permissions_update_admin"
  ON public.user_permissions
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'Admin'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "user_permissions_delete_admin"
  ON public.user_permissions
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'Admin'
    )
  );

-- Pending invites: permission template before the user has a profile
CREATE TABLE public.pending_team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  can_view_financials boolean NOT NULL DEFAULT false,
  can_dispatch_loads boolean NOT NULL DEFAULT false,
  can_edit_fleet boolean NOT NULL DEFAULT false,
  admin_access boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pending_team_invites_org_email_unique UNIQUE (org_id, email)
);

CREATE INDEX pending_team_invites_org_id_idx ON public.pending_team_invites (org_id);

ALTER TABLE public.pending_team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_invites_select_same_org"
  ON public.pending_team_invites
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "pending_invites_write_admin"
  ON public.pending_team_invites
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'Admin'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Backfill permissions for existing profiles (one row per profile)
INSERT INTO public.user_permissions (
  profile_id,
  org_id,
  can_view_financials,
  can_dispatch_loads,
  can_edit_fleet,
  admin_access
)
SELECT
  p.id,
  p.org_id,
  CASE WHEN p.role = 'Admin' THEN true ELSE false END,
  CASE WHEN p.role IN ('Admin', 'Dispatcher') THEN true ELSE false END,
  CASE WHEN p.role = 'Admin' THEN true ELSE false END,
  CASE WHEN p.role = 'Admin' THEN true ELSE false END
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_permissions u WHERE u.profile_id = p.id
);

CREATE OR REPLACE FUNCTION public.create_default_user_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_permissions (
    profile_id,
    org_id,
    can_view_financials,
    can_dispatch_loads,
    can_edit_fleet,
    admin_access
  )
  VALUES (
    NEW.id,
    NEW.org_id,
    CASE WHEN NEW.role = 'Admin' THEN true ELSE false END,
    CASE WHEN NEW.role IN ('Admin', 'Dispatcher') THEN true ELSE false END,
    CASE WHEN NEW.role = 'Admin' THEN true ELSE false END,
    CASE WHEN NEW.role = 'Admin' THEN true ELSE false END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_default_permissions ON public.profiles;
CREATE TRIGGER profiles_default_permissions
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.create_default_user_permissions();
