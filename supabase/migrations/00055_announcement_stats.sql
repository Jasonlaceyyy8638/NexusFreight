-- Open/click analytics for bulk product announcements (links to product_update_send_log).

CREATE TABLE public.announcement_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.product_update_send_log (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  opened_at timestamptz,
  clicked_at timestamptz,
  CONSTRAINT announcement_stats_announcement_user_unique UNIQUE (announcement_id, user_id)
);

CREATE INDEX announcement_stats_announcement_idx
  ON public.announcement_stats (announcement_id);

CREATE INDEX announcement_stats_user_idx
  ON public.announcement_stats (user_id);

COMMENT ON TABLE public.announcement_stats IS
  'First open / first tracked link click per recipient per announcement send.';

ALTER TABLE public.announcement_stats ENABLE ROW LEVEL SECURITY;

-- Service-role API routes call these; not granted to anon/authenticated.
CREATE OR REPLACE FUNCTION public.record_announcement_open(
  p_announcement uuid,
  p_user uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.announcement_stats (announcement_id, user_id, opened_at)
  VALUES (p_announcement, p_user, now())
  ON CONFLICT (announcement_id, user_id)
  DO UPDATE SET opened_at = COALESCE(announcement_stats.opened_at, EXCLUDED.opened_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_announcement_click(
  p_announcement uuid,
  p_user uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.announcement_stats (announcement_id, user_id, clicked_at)
  VALUES (p_announcement, p_user, now())
  ON CONFLICT (announcement_id, user_id)
  DO UPDATE SET clicked_at = COALESCE(announcement_stats.clicked_at, EXCLUDED.clicked_at);
END;
$$;

REVOKE ALL ON FUNCTION public.record_announcement_open(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_announcement_open(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.record_announcement_click(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_announcement_click(uuid, uuid) TO service_role;
