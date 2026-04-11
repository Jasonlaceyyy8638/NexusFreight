-- Ensure market_rates is on the realtime publication (idempotent if 00063 already added it).
DO $$
BEGIN
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
