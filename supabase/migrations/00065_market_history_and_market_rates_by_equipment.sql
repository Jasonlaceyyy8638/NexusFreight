-- Daily archive (`market_history`) + normalized `market_rates` (one row per equipment_type).
-- Idempotent: safe when `market_history` already exists or `market_rates` is already per-equipment.

CREATE TABLE IF NOT EXISTS public.market_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.market_history'::regclass
      AND contype = 'u'
      AND conname = 'market_history_snapshot_date_key'
  ) THEN
    ALTER TABLE public.market_history
      ADD CONSTRAINT market_history_snapshot_date_key UNIQUE (snapshot_date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS market_history_snapshot_date_desc_idx ON public.market_history (snapshot_date DESC);

COMMENT ON TABLE public.market_history IS
  'Daily national spot snapshot (UTC date); written after equipment upserts for trend charts and duplicate-send guard.';

ALTER TABLE public.market_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'market_history'
      AND policyname = 'market_history_select_authenticated'
  ) THEN
    CREATE POLICY "market_history_select_authenticated"
      ON public.market_history
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Wide → per-equipment (skip when already normalized).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'market_rates'
      AND column_name = 'van_dry'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'market_rates'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.market_rates;
  END IF;

  ALTER TABLE public.market_rates RENAME TO market_rates_wide_legacy_00065;

  CREATE TABLE public.market_rates (
    equipment_type text NOT NULL PRIMARY KEY,
    usd_per_mile numeric(10, 4) NOT NULL,
    as_of timestamptz NOT NULL DEFAULT timezone('utc', now()),
    source text NOT NULL,
    pro_tip text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT market_rates_equipment_type_chk CHECK (
      equipment_type IN (
        'dry_van',
        'reefer',
        'flatbed',
        'box_truck',
        'cargo_van',
        'power_only'
      )
    )
  );

  CREATE INDEX IF NOT EXISTS market_rates_as_of_desc_idx ON public.market_rates (as_of DESC);

  COMMENT ON TABLE public.market_rates IS
    'Latest national spot $/mi per equipment_type; automated-market-pulse upserts all six rows each run.';

  ALTER TABLE public.market_rates ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "market_rates_select_authenticated"
    ON public.market_rates
    FOR SELECT
    TO authenticated
    USING (true);

  -- One PK row per equipment_type: seed from the single newest wide snapshot only.
  INSERT INTO public.market_rates (
    equipment_type,
    usd_per_mile,
    as_of,
    source,
    pro_tip,
    created_at,
    updated_at
  )
  WITH latest_wide AS (
    SELECT *
    FROM public.market_rates_wide_legacy_00065
    ORDER BY as_of DESC NULLS LAST
    LIMIT 1
  )
  SELECT 'dry_van', van_dry, as_of, source, pro_tip, created_at, created_at
  FROM latest_wide
  UNION ALL
  SELECT 'reefer', reefer, as_of, source, NULL::text, created_at, created_at
  FROM latest_wide
  UNION ALL
  SELECT 'flatbed', flatbed, as_of, source, NULL::text, created_at, created_at
  FROM latest_wide
  UNION ALL
  SELECT 'box_truck', box_truck, as_of, source, NULL::text, created_at, created_at
  FROM latest_wide
  UNION ALL
  SELECT 'cargo_van', sprinter, as_of, source, NULL::text, created_at, created_at
  FROM latest_wide
  UNION ALL
  SELECT 'power_only', power_only, as_of, source, NULL::text, created_at, created_at
  FROM latest_wide;

  INSERT INTO public.market_history (
    snapshot_date,
    source,
    van_dry,
    reefer,
    flatbed,
    box_truck,
    sprinter,
    power_only,
    pro_tip
  )
  SELECT DISTINCT ON ((as_of AT TIME ZONE 'UTC')::date)
    (as_of AT TIME ZONE 'UTC')::date,
    source,
    van_dry,
    reefer,
    flatbed,
    box_truck,
    sprinter,
    power_only,
    pro_tip
  FROM public.market_rates_wide_legacy_00065
  ORDER BY (as_of AT TIME ZONE 'UTC')::date, as_of DESC
  ON CONFLICT (snapshot_date) DO NOTHING;

  DROP TABLE public.market_rates_wide_legacy_00065;

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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'market_rates'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'market_rates'
        AND column_name = 'equipment_type'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.market_rates;
    END IF;
  END IF;
END $$;
