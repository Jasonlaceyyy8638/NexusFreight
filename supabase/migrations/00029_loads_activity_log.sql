-- Append-only style log for SMS / quick-fire alerts (JSON array of entries).
ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS activity_log jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.loads.activity_log IS 'Chronological log entries: { "at": ISO timestamp, "message": text }.';
