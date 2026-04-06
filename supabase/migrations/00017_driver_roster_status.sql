-- Roster status: active | on_vacation | terminated (replaces legacy dispatch states)
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_status_check;

UPDATE public.drivers
SET status = CASE
  WHEN status IN ('available', 'off_duty', 'en_route') THEN 'active'
  WHEN status = 'inactive' THEN 'terminated'
  ELSE 'active'
END;

ALTER TABLE public.drivers
  ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_roster_status_check CHECK (
    status IN ('active', 'on_vacation', 'terminated')
  );
