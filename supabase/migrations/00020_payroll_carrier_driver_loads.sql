-- Dispatcher carrier service fee: percentage of linehaul or flat cents per delivered load
ALTER TABLE public.carriers
  ADD COLUMN IF NOT EXISTS service_fee_type text NOT NULL DEFAULT 'percent'
    CHECK (service_fee_type IN ('percent', 'flat'));

ALTER TABLE public.carriers
  ADD COLUMN IF NOT EXISTS service_fee_flat_cents bigint;

COMMENT ON COLUMN public.carriers.service_fee_flat_cents IS 'When service_fee_type=flat, commission per delivered load (cents).';

-- Driver pay profile (carrier fleet)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS pay_structure text NOT NULL DEFAULT 'percent_gross'
    CHECK (pay_structure IN ('percent_gross', 'cpm'));

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS pay_percent_of_gross numeric(6, 2) NOT NULL DEFAULT 30.00;

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS pay_cpm_cents integer NOT NULL DEFAULT 70;

COMMENT ON COLUMN public.drivers.pay_cpm_cents IS 'Driver CPM in cents per loaded mile (e.g. 70 = $0.70/mi).';

-- Load-level payroll / deadhead / commission snapshot
ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS pay_deadhead boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deadhead_rate_cpm_cents integer,
  ADD COLUMN IF NOT EXISTS deadhead_miles numeric(12, 2),
  ADD COLUMN IF NOT EXISTS loaded_miles numeric(12, 2),
  ADD COLUMN IF NOT EXISTS deadhead_pay_cents bigint,
  ADD COLUMN IF NOT EXISTS loaded_driver_pay_cents bigint,
  ADD COLUMN IF NOT EXISTS driver_total_pay_cents bigint,
  ADD COLUMN IF NOT EXISTS dispatcher_commission_cents bigint;

COMMENT ON COLUMN public.loads.dispatcher_commission_cents IS 'Agency commission snapshot when load is marked delivered.';
