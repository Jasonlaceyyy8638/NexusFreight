-- Latest phone GPS per driver (driver app) for Live Map; separate from ELD/truck pings.
CREATE TABLE public.driver_locations (
  driver_id uuid PRIMARY KEY REFERENCES public.drivers (id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.carriers (id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy_m double precision,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX driver_locations_org_id_idx ON public.driver_locations (org_id);
CREATE INDEX driver_locations_carrier_id_idx ON public.driver_locations (carrier_id);

COMMENT ON TABLE public.driver_locations IS
  'Latest position from the native driver app; dispatch Live Map merges with ELD truck positions.';

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Dispatchers / fleet: read any row in their org.
CREATE POLICY "driver_locations_select_same_org"
  ON public.driver_locations
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Driver app: upsert only for the roster row linked to this auth user; org/carrier must match driver.
CREATE POLICY "driver_locations_insert_own_driver"
  ON public.driver_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.drivers d
      WHERE d.id = driver_id
        AND d.auth_user_id = auth.uid()
        AND d.org_id = org_id
        AND d.carrier_id = carrier_id
    )
  );

CREATE POLICY "driver_locations_update_own_driver"
  ON public.driver_locations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_id AND d.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.drivers d
      WHERE d.id = driver_id
        AND d.auth_user_id = auth.uid()
        AND d.org_id = org_id
        AND d.carrier_id = carrier_id
    )
  );

CREATE POLICY "driver_locations_delete_own_driver"
  ON public.driver_locations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_id AND d.auth_user_id = auth.uid()
    )
  );

-- Expo / FCM push tokens for load-assignment notifications (server reads via service role).
CREATE TABLE public.driver_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers (id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at timestamptz NOT NULL DEFAULT now (),
  CONSTRAINT driver_push_tokens_token_unique UNIQUE (expo_push_token)
);

CREATE INDEX driver_push_tokens_driver_id_idx ON public.driver_push_tokens (driver_id);
CREATE INDEX driver_push_tokens_user_id_idx ON public.driver_push_tokens (user_id);

COMMENT ON TABLE public.driver_push_tokens IS
  'Device tokens from the driver app; use service role to send pushes when loads are assigned.';

ALTER TABLE public.driver_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_push_tokens_select_own"
  ON public.driver_push_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "driver_push_tokens_insert_own"
  ON public.driver_push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid ()
    AND EXISTS (
      SELECT 1
      FROM public.drivers d
      WHERE d.id = driver_id
        AND d.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "driver_push_tokens_update_own"
  ON public.driver_push_tokens
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid ())
  WITH CHECK (
    user_id = auth.uid ()
    AND EXISTS (
      SELECT 1
      FROM public.drivers d
      WHERE d.id = driver_id
        AND d.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "driver_push_tokens_delete_own"
  ON public.driver_push_tokens
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid ());

-- Realtime: live map updates when drivers move.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'driver_locations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
    END IF;
  END IF;
END $$;
