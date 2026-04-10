-- Audit log for bulk product-update emails (dedupe + compliance).

CREATE TABLE public.product_update_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload_hash text NOT NULL,
  title text NOT NULL,
  body_excerpt text NOT NULL,
  recipient_count integer NOT NULL CHECK (recipient_count >= 0),
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_update_send_log_payload_sent_idx
  ON public.product_update_send_log (payload_hash, sent_at DESC);

COMMENT ON TABLE public.product_update_send_log IS
  'Records each bulk product announcement send; Edge Function rejects duplicate payload_hash within 1 hour.';

ALTER TABLE public.product_update_send_log ENABLE ROW LEVEL SECURITY;
