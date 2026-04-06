-- ELD engine: queryable credentials + Live Map coordinates

ALTER TABLE public.telematics_tokens
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

COMMENT ON COLUMN public.telematics_tokens.access_token IS
  'Provider access token or API key (service role only). Encrypted ciphertext kept for backup.';
COMMENT ON COLUMN public.telematics_tokens.refresh_token IS
  'OAuth refresh token when applicable (e.g. Motive).';

ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS current_latitude double precision,
  ADD COLUMN IF NOT EXISTS current_longitude double precision;

COMMENT ON COLUMN public.trucks.current_latitude IS
  'Latest telematics latitude; mirrored with last_lat by sync jobs.';
COMMENT ON COLUMN public.trucks.current_longitude IS
  'Latest telematics longitude; mirrored with last_lng by sync jobs.';
