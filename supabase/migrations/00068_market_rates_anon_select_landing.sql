-- Allow anonymous reads on `market_rates` so the marketing landing page (Market Pulse)
-- can show live benchmarks without signing in. Data is non-sensitive national spot $/mi.
-- Previously only `authenticated` could SELECT, so logged-out visitors always saw an empty state.

DROP POLICY IF EXISTS "market_rates_select_anon_public" ON public.market_rates;

CREATE POLICY "market_rates_select_anon_public"
  ON public.market_rates
  FOR SELECT
  TO anon
  USING (true);
