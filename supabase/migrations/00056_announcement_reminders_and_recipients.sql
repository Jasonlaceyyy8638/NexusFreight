-- Full body for reminder copy; per-recipient audit for autonomous re-engagement.

ALTER TABLE public.product_update_send_log
  ADD COLUMN IF NOT EXISTS body_text text;

COMMENT ON COLUMN public.product_update_send_log.body_text IS
  'Full announcement body (same as admin composer); used for 72h reminder summaries.';

-- Who actually received each bulk send (for reminder targeting).
CREATE TABLE public.announcement_send_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.product_update_send_log (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcement_send_recipients_unique UNIQUE (announcement_id, user_id)
);

CREATE INDEX announcement_send_recipients_announcement_idx
  ON public.announcement_send_recipients (announcement_id);

CREATE INDEX announcement_send_recipients_user_idx
  ON public.announcement_send_recipients (user_id);

COMMENT ON TABLE public.announcement_send_recipients IS
  'Profiles that successfully received a given bulk announcement email.';

ALTER TABLE public.announcement_send_recipients ENABLE ROW LEVEL SECURITY;

-- One reminder per (announcement, user); prevents duplicate nudges.
CREATE TABLE public.announcement_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.product_update_send_log (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcement_reminder_log_unique UNIQUE (announcement_id, user_id)
);

CREATE INDEX announcement_reminder_log_announcement_idx
  ON public.announcement_reminder_log (announcement_id);

CREATE INDEX announcement_reminder_log_user_idx
  ON public.announcement_reminder_log (user_id);

COMMENT ON TABLE public.announcement_reminder_log IS
  'Automated 72h unread reminder sends; unique per announcement and profile.';

ALTER TABLE public.announcement_reminder_log ENABLE ROW LEVEL SECURITY;
