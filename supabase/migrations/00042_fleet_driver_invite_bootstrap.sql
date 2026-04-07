-- Fleet driver email invite: join existing Carrier org (no new organization).
-- Also skip automatic trial for Driver-role profiles (employees).

CREATE OR REPLACE FUNCTION public.set_profile_trial_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing integer;
BEGIN
  IF NEW.role = 'Driver' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::integer INTO existing FROM public.profiles;
  IF existing < 5 THEN
    NEW.is_beta_user := true;
    NEW.trial_type := 'BETA';
    NEW.trial_ends_at := (timezone('utc', now())) + interval '45 days';
  ELSE
    NEW.is_beta_user := false;
    NEW.trial_type := 'TRIAL';
    NEW.trial_ends_at := (timezone('utc', now())) + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$;

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
