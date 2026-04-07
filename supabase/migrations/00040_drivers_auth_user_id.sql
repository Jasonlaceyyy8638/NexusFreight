-- Link roster row to Supabase Auth user for the driver mobile app.
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.drivers.auth_user_id IS
  'When set, this driver can sign in and use /driver; must match auth.users.id.';

CREATE UNIQUE INDEX IF NOT EXISTS drivers_auth_user_id_key
  ON public.drivers (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
