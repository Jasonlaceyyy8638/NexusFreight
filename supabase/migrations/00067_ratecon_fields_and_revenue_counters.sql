-- Rate confirmation OCR fields, dispatcher commission %, carrier/driver revenue counters.
-- Does not touch market_rates or automated-market-pulse.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dispatcher_commission_percent numeric(5, 2) NOT NULL DEFAULT 10.00;

COMMENT ON COLUMN public.profiles.dispatcher_commission_percent IS
  'Dispatcher personal commission % applied to linehaul when role is Dispatcher (RateCon OCR flow).';

ALTER TABLE public.carriers
  ADD COLUMN IF NOT EXISTS total_revenue_cents bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.carriers.total_revenue_cents IS
  'Running sum of load linehaul (rate_cents) for this carrier; incremented on load insert.';

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS week_revenue_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS week_revenue_iso_week text;

COMMENT ON COLUMN public.drivers.week_revenue_cents IS
  'Assigned driver linehaul attributed to the current ISO week (UTC).';
COMMENT ON COLUMN public.drivers.week_revenue_iso_week IS
  'ISO week key (e.g. 2026-W15) matching week_revenue_cents.';

ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS pickup_location_name text,
  ADD COLUMN IF NOT EXISTS pickup_address text,
  ADD COLUMN IF NOT EXISTS pickup_date date,
  ADD COLUMN IF NOT EXISTS pickup_time_window text,
  ADD COLUMN IF NOT EXISTS delivery_location_name text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_date date,
  ADD COLUMN IF NOT EXISTS delivery_time_window text,
  ADD COLUMN IF NOT EXISTS commodities text,
  ADD COLUMN IF NOT EXISTS weight_lbs numeric(14, 2),
  ADD COLUMN IF NOT EXISTS special_instructions text;

COMMENT ON COLUMN public.loads.pickup_location_name IS 'Structured pickup from RateCon OCR; origin may duplicate as a summary line.';
COMMENT ON COLUMN public.loads.delivery_location_name IS 'Structured delivery from RateCon OCR; destination may duplicate as a summary line.';

ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS dispatcher_personal_profit_cents bigint;

COMMENT ON COLUMN public.loads.dispatcher_personal_profit_cents IS
  'Dispatcher personal commission (profiles.dispatcher_commission_percent of linehaul); not driver-facing. Distinct from dispatcher_commission_cents (carrier service fee snapshot on deliver).';

-- One-time backfill: carrier totals match historical loads (before insert trigger).
UPDATE public.carriers c
SET total_revenue_cents = COALESCE(
  (SELECT SUM(l.rate_cents)::bigint FROM public.loads l WHERE l.carrier_id = c.id),
  0
);

CREATE OR REPLACE FUNCTION public.loads_increment_revenue_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_week text;
BEGIN
  UPDATE public.carriers
  SET total_revenue_cents = total_revenue_cents + NEW.rate_cents
  WHERE id = NEW.carrier_id;

  IF NEW.driver_id IS NOT NULL AND NEW.rate_cents IS NOT NULL THEN
    cur_week :=
      to_char((CURRENT_TIMESTAMP AT TIME ZONE 'utc')::date, 'IYYY')
      || '-W'
      || lpad(
        to_char((CURRENT_TIMESTAMP AT TIME ZONE 'utc')::date, 'IW'),
        2,
        '0'
      );

    UPDATE public.drivers d
    SET
      week_revenue_iso_week = cur_week,
      week_revenue_cents = CASE
        WHEN d.week_revenue_iso_week IS DISTINCT FROM cur_week THEN NEW.rate_cents
        ELSE d.week_revenue_cents + NEW.rate_cents
      END
    WHERE d.id = NEW.driver_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS loads_increment_revenue_after_insert ON public.loads;

CREATE TRIGGER loads_increment_revenue_after_insert
  AFTER INSERT ON public.loads
  FOR EACH ROW
  EXECUTE PROCEDURE public.loads_increment_revenue_on_insert();
