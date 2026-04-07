-- Landing page lead capture (Join the Network). Inserts via service role API only.
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  company_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (
    role IN ('Dispatcher', 'Fleet Owner', 'Owner-Operator')
  ),
  source text NOT NULL DEFAULT 'landing_join_network',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX leads_email_idx ON public.leads (lower(email));

COMMENT ON TABLE public.leads IS 'Marketing / waitlist signups from the public site; written by POST /api/leads (service role).';

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
