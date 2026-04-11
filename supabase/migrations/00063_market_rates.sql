-- National spot-rate snapshots for dashboard + Morning Market Pulse emails.

CREATE TABLE public.market_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  as_of timestamptz NOT NULL DEFAULT timezone('utc', now()),
  source text NOT NULL,
  van_dry numeric(10, 4) NOT NULL,
  reefer numeric(10, 4) NOT NULL,
  flatbed numeric(10, 4) NOT NULL,
  box_truck numeric(10, 4) NOT NULL,
  sprinter numeric(10, 4) NOT NULL,
  power_only numeric(10, 4) NOT NULL,
  pro_tip text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX market_rates_as_of_desc_idx ON public.market_rates (as_of DESC);

COMMENT ON TABLE public.market_rates IS
  'Daily national spot $/mi snapshot; van_dry is base; derived equipment uses fixed multipliers from edge function.';

ALTER TABLE public.market_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_rates_select_authenticated"
  ON public.market_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role / edge function inserts (bypasses RLS).

ALTER PUBLICATION supabase_realtime ADD TABLE public.market_rates;
