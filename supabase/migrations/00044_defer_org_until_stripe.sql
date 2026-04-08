-- Defer organization creation until Stripe Checkout completes (webhook or return URL).
-- Profiles may temporarily have org_id NULL for Admin signups (carrier/dispatcher agency).

ALTER TABLE public.profiles
  ALTER COLUMN org_id DROP NOT NULL;

COMMENT ON COLUMN public.profiles.org_id IS
  'NULL until Stripe checkout.session completes; then set with new organization.';

-- Default permissions: only when org exists (FK requires org_id on user_permissions).
CREATE OR REPLACE FUNCTION public.create_default_user_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    RETURN NEW;
  END IF;

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

-- Welcome email only after org exists (server sends via Stripe completion path).
CREATE OR REPLACE FUNCTION public.notify_profile_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_url text;
  v_secret text;
BEGIN
  IF NEW.org_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT (
    NEW.is_beta_user IS TRUE
    OR NEW.trial_type = 'TRIAL'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = NEW.id LIMIT 1;
  IF v_email IS NULL OR length(trim(v_email)) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT c.endpoint_url::text, c.bearer_secret::text
    INTO v_url, v_secret
  FROM private.welcome_webhook_config c
  WHERE c.id = 1
  LIMIT 1;

  IF v_url IS NULL OR v_secret IS NULL OR length(trim(v_url)) = 0 OR length(trim(v_secret)) = 0 THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := trim(v_url),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    body := jsonb_build_object(
      'userId', NEW.id::text,
      'email', v_email,
      'fullName', COALESCE(
        NULLIF(trim(NEW.full_name), ''),
        split_part(v_email, '@', 1)
      )
    )
  );

  RETURN NEW;
END;
$$;

-- Self row visible when org_id is NULL (RLS ORs with same-org policy).
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Carrier / dispatcher: profile only; org created in app after Stripe Checkout.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
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

  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone_number', '')), '');

  INSERT INTO public.profiles (id, org_id, role, full_name, phone_number, phone)
  VALUES (
    NEW.id,
    NULL,
    'Admin',
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
    v_phone,
    v_phone
  );

  RETURN NEW;
END;
$$;
