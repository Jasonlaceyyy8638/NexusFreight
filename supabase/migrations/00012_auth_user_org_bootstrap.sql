-- On first auth.users insert, create organization + profile from raw_user_meta_data.
-- Client should pass: role_type ('dispatcher' | 'carrier'), full_name, agency_name (optional),
-- company_name, dot_number, mc_number, is_active_authority (for carriers).

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
BEGIN
  v_role_type := lower(trim(COALESCE(NEW.raw_user_meta_data->>'role_type', 'dispatcher')));

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

    INSERT INTO public.profiles (id, org_id, role, full_name)
    VALUES (
      NEW.id,
      new_org_id,
      'Admin',
      NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '')
    );
  ELSE
    v_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'agency_name', '')), '');
    IF v_name IS NULL THEN
      v_name := initcap(replace(split_part(NEW.email, '@', 1), '.', ' ')) || ' Dispatch';
    END IF;

    INSERT INTO public.organizations (name, type)
    VALUES (v_name, 'Agency')
    RETURNING id INTO new_org_id;

    INSERT INTO public.profiles (id, org_id, role, full_name)
    VALUES (
      NEW.id,
      new_org_id,
      'Admin',
      NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
