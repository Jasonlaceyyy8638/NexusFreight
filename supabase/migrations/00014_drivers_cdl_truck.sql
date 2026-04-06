-- CDL / assignment fields for roster (license_number already exists for legacy)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS cdl_number text,
  ADD COLUMN IF NOT EXISTS license_expiration date,
  ADD COLUMN IF NOT EXISTS assigned_truck_id uuid REFERENCES public.trucks (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS drivers_assigned_truck_id_idx ON public.drivers (assigned_truck_id);
