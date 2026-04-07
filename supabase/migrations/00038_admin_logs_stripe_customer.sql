-- Admin audit trail + Stripe customer id on profiles (for refunds/credits)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe Customer ID (cus_…); set at Checkout return for admin/refunds.';

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  affected_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  action text NOT NULL,
  reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_logs_created_at_idx ON public.admin_logs (created_at DESC);
CREATE INDEX admin_logs_affected_user_idx ON public.admin_logs (affected_user_id);

COMMENT ON TABLE public.admin_logs IS 'Nexus Control actions (refunds, credits, cancel, trial override). Service role only.';

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
