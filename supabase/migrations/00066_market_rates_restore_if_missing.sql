-- Recreate public.market_rates (wide snapshot shape, same as 00063) when the relation was
-- dropped by a failed 00065 and nothing replaced it — fixes PostgREST "table not in schema cache".
-- No-op when market_rates already exists (any shape).
--
-- If you still have public.market_rates_wide_legacy_00065 with data, after this file runs you can:
--   INSERT INTO public.market_rates (as_of, source, van_dry, reefer, flatbed, box_truck, sprinter, power_only, pro_tip, created_at)
--   SELECT as_of, source, van_dry, reefer, flatbed, box_truck, sprinter, power_only, pro_tip, created_at
--   FROM public.market_rates_wide_legacy_00065;

DO $$
BEGIN
  IF to_regclass('public.market_rates') IS NOT NULL THEN
    RETURN;
  END IF;

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
END $$;

DO $$
BEGIN
  IF to_regclass('public.market_rates') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'market_rates'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.market_rates;
    END IF;
  END IF;
END $$;
