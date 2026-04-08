-- Pre-signup Stripe Checkout: org placeholder + row for linking after auth signup.

CREATE TABLE IF NOT EXISTS public.pending_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_checkout_session_id text NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('dispatcher', 'carrier')),
  billing_plan text NOT NULL CHECK (billing_plan IN ('monthly', 'yearly')),
  org_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_signups_email_lower_idx
  ON public.pending_signups (lower(email));

COMMENT ON TABLE public.pending_signups IS
  'Filled by Stripe webhook after checkout; linked to profile on signup via session_id.';

ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;

-- No client policies; service role bypasses RLS for webhook + attach flows.

CREATE OR REPLACE FUNCTION public.auth_user_id_by_email(check_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim(check_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.auth_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_id_by_email(text) TO service_role;
