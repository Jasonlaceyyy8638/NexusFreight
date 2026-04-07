-- Multi-fleet tree: companies (1:1 with carriers) + user memberships per company.
-- Platform audit events for Nexus Control (loads, MC lookups, driver invites).

CREATE TYPE public.membership_role AS ENUM ('admin', 'dispatcher', 'driver');

CREATE TABLE public.companies (
  id uuid PRIMARY KEY REFERENCES public.carriers (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.companies IS 'Managed fleet / carrier identity; id matches carriers.id.';

CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.membership_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE INDEX memberships_company_id_idx ON public.memberships (company_id);
CREATE INDEX memberships_user_id_idx ON public.memberships (user_id);

COMMENT ON TABLE public.memberships IS 'Links users to managed companies (carriers): admin, dispatcher, or driver.';

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memberships_select_own"
  ON public.memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.platform_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('load_created', 'mc_lookup', 'driver_invited')),
  org_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX platform_audit_events_created_at_idx ON public.platform_audit_events (created_at DESC);
CREATE INDEX platform_audit_events_type_idx ON public.platform_audit_events (event_type);

COMMENT ON TABLE public.platform_audit_events IS 'Product audit trail for Nexus Control (service role + triggers).';

ALTER TABLE public.platform_audit_events ENABLE ROW LEVEL SECURITY;

-- Backfill companies from existing carriers
INSERT INTO public.companies (id)
SELECT id FROM public.carriers
ON CONFLICT DO NOTHING;

-- Admins + dispatchers in an agency get membership on each carrier under that org
INSERT INTO public.memberships (company_id, user_id, role)
SELECT c.id, p.id,
  CASE
    WHEN p.role = 'Admin' THEN 'admin'::public.membership_role
    ELSE 'dispatcher'::public.membership_role
  END
FROM public.carriers c
JOIN public.profiles p ON p.org_id = c.org_id
  AND p.role IN ('Admin', 'Dispatcher')
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Drivers with app accounts
INSERT INTO public.memberships (company_id, user_id, role)
SELECT d.carrier_id, d.auth_user_id, 'driver'::public.membership_role
FROM public.drivers d
WHERE d.auth_user_id IS NOT NULL
ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role;

CREATE OR REPLACE FUNCTION public.ensure_company_and_memberships_for_carrier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.companies (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.memberships (company_id, user_id, role)
  SELECT NEW.id, p.id,
    CASE
      WHEN p.role = 'Admin' THEN 'admin'::public.membership_role
      ELSE 'dispatcher'::public.membership_role
    END
  FROM public.profiles p
  WHERE p.org_id = NEW.org_id
    AND p.role IN ('Admin', 'Dispatcher')
  ON CONFLICT (company_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS carriers_after_insert_companies ON public.carriers;

CREATE TRIGGER carriers_after_insert_companies
  AFTER INSERT ON public.carriers
  FOR EACH ROW
  EXECUTE PROCEDURE public.ensure_company_and_memberships_for_carrier();

CREATE OR REPLACE FUNCTION public.audit_load_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_audit_events (event_type, org_id, actor_user_id, metadata)
  VALUES (
    'load_created',
    NEW.org_id,
    auth.uid(),
    jsonb_build_object(
      'load_id', NEW.id,
      'carrier_id', NEW.carrier_id,
      'driver_id', NEW.driver_id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS loads_audit_after_insert ON public.loads;

CREATE TRIGGER loads_audit_after_insert
  AFTER INSERT ON public.loads
  FOR EACH ROW
  EXECUTE PROCEDURE public.audit_load_insert();

-- Full handle_new_user: fleet_driver + agency_driver + memberships + default signups

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  v_role_type text;
  v_name text;
  v_active boolean;
  v_phone text;
  v_nf_invite text;
  v_carrier_id uuid;
  v_driver_id uuid;
  v_driver_name text;
BEGIN
  v_nf_invite := lower(trim(COALESCE(NEW.raw_user_meta_data->>'nf_invite', '')));

  IF v_nf_invite = 'fleet_driver' THEN
    new_org_id := (NEW.raw_user_meta_data->>'org_id')::uuid;
    v_carrier_id := (NEW.raw_user_meta_data->>'carrier_id')::uuid;

    IF new_org_id IS NULL OR v_carrier_id IS NULL THEN
      RAISE EXCEPTION 'fleet_driver invite missing org_id or carrier_id';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = new_org_id AND o.type = 'Carrier'
    ) THEN
      RAISE EXCEPTION 'fleet_driver invite: invalid organization';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.carriers c
      WHERE c.id = v_carrier_id AND c.org_id = new_org_id
    ) THEN
      RAISE EXCEPTION 'fleet_driver invite: carrier does not belong to org';
    END IF;

    v_driver_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
    IF v_driver_name IS NULL THEN
      v_driver_name := initcap(replace(split_part(NEW.email, '@', 1), '.', ' '));
    END IF;

    INSERT INTO public.profiles (id, org_id, role, full_name, phone_number, phone)
    VALUES (
      NEW.id,
      new_org_id,
      'Driver',
      v_driver_name,
      NULL,
      NULL
    );

    INSERT INTO public.drivers (
      org_id,
      carrier_id,
      full_name,
      status,
      contact_email
    )
    VALUES (
      new_org_id,
      v_carrier_id,
      v_driver_name,
      'active',
      NEW.email
    )
    RETURNING id INTO v_driver_id;

    UPDATE public.drivers
    SET auth_user_id = NEW.id
    WHERE id = v_driver_id;

    INSERT INTO public.memberships (company_id, user_id, role)
    VALUES (v_carrier_id, NEW.id, 'driver'::public.membership_role)
    ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role;

    RETURN NEW;
  END IF;

  IF v_nf_invite = 'agency_driver' THEN
    new_org_id := (NEW.raw_user_meta_data->>'org_id')::uuid;
    v_carrier_id := (NEW.raw_user_meta_data->>'carrier_id')::uuid;

    IF new_org_id IS NULL OR v_carrier_id IS NULL THEN
      RAISE EXCEPTION 'agency_driver invite missing org_id or carrier_id';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = new_org_id AND o.type = 'Agency'
    ) THEN
      RAISE EXCEPTION 'agency_driver invite: invalid organization';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.carriers c
      WHERE c.id = v_carrier_id AND c.org_id = new_org_id
    ) THEN
      RAISE EXCEPTION 'agency_driver invite: carrier does not belong to agency';
    END IF;

    v_driver_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
    IF v_driver_name IS NULL THEN
      v_driver_name := initcap(replace(split_part(NEW.email, '@', 1), '.', ' '));
    END IF;

    INSERT INTO public.profiles (id, org_id, role, full_name, phone_number, phone)
    VALUES (
      NEW.id,
      new_org_id,
      'Driver',
      v_driver_name,
      NULL,
      NULL
    );

    INSERT INTO public.drivers (
      org_id,
      carrier_id,
      full_name,
      status,
      contact_email
    )
    VALUES (
      new_org_id,
      v_carrier_id,
      v_driver_name,
      'active',
      NEW.email
    )
    RETURNING id INTO v_driver_id;

    UPDATE public.drivers
    SET auth_user_id = NEW.id
    WHERE id = v_driver_id;

    INSERT INTO public.memberships (company_id, user_id, role)
    VALUES (v_carrier_id, NEW.id, 'driver'::public.membership_role)
    ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role;

    RETURN NEW;
  END IF;

  v_role_type := lower(trim(COALESCE(NEW.raw_user_meta_data->>'role_type', 'dispatcher')));
  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone_number', '')), '');

  IF v_role_type = 'carrier' THEN
    v_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'company_name', '')), '');
    IF v_name IS NULL THEN
      v_name := split_part(NEW.email, '@', 1);
    END IF;

    v_active := CASE
      WHEN (NEW.raw_user_meta_data->>'is_active_authority') IN ('true', 't', '1') THEN true
      WHEN (NEW.raw_user_meta_data->>'is_active_authority') IN ('false', 'f', '0') THEN false
      ELSE NULL
    END;

    INSERT INTO public.organizations (name, type, dot_number, mc_number, is_active_authority)
    VALUES (
      v_name,
      'Carrier',
      NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'dot_number', '')), ''),
      NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'mc_number', '')), ''),
      v_active
    )
    RETURNING id INTO new_org_id;

    INSERT INTO public.profiles (id, org_id, role, full_name, phone_number, phone)
    VALUES (
      NEW.id,
      new_org_id,
      'Admin',
      NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
      v_phone,
      v_phone
    );
  ELSE
    v_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'agency_name', '')), '');
    IF v_name IS NULL THEN
      v_name := initcap(replace(split_part(NEW.email, '@', 1), '.', ' ')) || ' Dispatch';
    END IF;

    INSERT INTO public.organizations (name, type)
    VALUES (v_name, 'Agency')
    RETURNING id INTO new_org_id;

    INSERT INTO public.profiles (id, org_id, role, full_name, phone_number, phone)
    VALUES (
      NEW.id,
      new_org_id,
      'Admin',
      NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
      v_phone,
      v_phone
    );
  END IF;

  RETURN NEW;
END;
$$;
