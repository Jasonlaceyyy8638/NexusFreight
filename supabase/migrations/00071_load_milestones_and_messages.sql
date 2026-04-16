-- Driver workflow milestones (sequential) + in-app load messaging between dispatch and driver.

ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS driver_milestone_pickup_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_milestone_loaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_milestone_delivery_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_milestone_bol_at timestamptz,
  ADD COLUMN IF NOT EXISTS bol_storage_path text;

COMMENT ON COLUMN public.loads.driver_milestone_pickup_at IS 'Driver confirmed on-site at shipper.';
COMMENT ON COLUMN public.loads.driver_milestone_loaded_at IS 'Driver confirmed freight loaded.';
COMMENT ON COLUMN public.loads.driver_milestone_delivery_at IS 'Driver confirmed arrival at receiver (before BOL).';
COMMENT ON COLUMN public.loads.driver_milestone_bol_at IS 'Driver confirmed signed BOL; completes load.';
COMMENT ON COLUMN public.loads.bol_storage_path IS 'Optional storage path for BOL image/PDF.';

CREATE TABLE public.load_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid NOT NULL REFERENCES public.loads (id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX load_messages_load_created_idx ON public.load_messages (load_id, created_at DESC);
CREATE INDEX load_messages_org_idx ON public.load_messages (org_id);

ALTER TABLE public.load_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "load_messages_select_org_participants"
  ON public.load_messages
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('Admin', 'Dispatcher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.loads l
        INNER JOIN public.drivers d ON d.id = l.driver_id AND d.auth_user_id = auth.uid()
        WHERE l.id = load_messages.load_id
      )
    )
  );

CREATE POLICY "load_messages_insert_participants"
  ON public.load_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND org_id IN (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.loads l WHERE l.id = load_id AND l.org_id = org_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('Admin', 'Dispatcher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.loads l
        INNER JOIN public.drivers d ON d.id = l.driver_id AND d.auth_user_id = auth.uid()
        WHERE l.id = load_id
      )
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.load_messages;

-- Driver-only RPC: advance sequential milestones; completes load on final step.
CREATE OR REPLACE FUNCTION public.driver_advance_load_milestone(p_load_id uuid, p_step text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver public.drivers%ROWTYPE;
  v_load public.loads%ROWTYPE;
  v_log jsonb;
  v_at text;
BEGIN
  IF p_step NOT IN (
    'pickup_on_site',
    'pickup_loaded',
    'delivery_arrived',
    'bol_signed'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_step');
  END IF;

  SELECT * INTO v_driver FROM public.drivers WHERE auth_user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_a_driver');
  END IF;

  SELECT * INTO v_load FROM public.loads WHERE id = p_load_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'load_not_found');
  END IF;

  IF v_load.driver_id IS DISTINCT FROM v_driver.id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_your_load');
  END IF;

  IF v_load.status IN ('draft', 'cancelled', 'delivered') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_load_status');
  END IF;

  v_at := to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  IF p_step = 'pickup_on_site' THEN
    IF v_load.driver_milestone_pickup_at IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_completed');
    END IF;
    v_log := jsonb_build_object('at', v_at, 'message', 'Driver: On site at pickup');
    UPDATE public.loads
    SET
      driver_milestone_pickup_at = now(),
      updated_at = now(),
      activity_log = COALESCE(activity_log, '[]'::jsonb) || jsonb_build_array(v_log)
    WHERE id = p_load_id;

  ELSIF p_step = 'pickup_loaded' THEN
    IF v_load.driver_milestone_pickup_at IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'complete_previous_step');
    END IF;
    IF v_load.driver_milestone_loaded_at IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_completed');
    END IF;
    v_log := jsonb_build_object('at', v_at, 'message', 'Driver: Loaded at shipper');
    UPDATE public.loads
    SET
      driver_milestone_loaded_at = now(),
      updated_at = now(),
      activity_log = COALESCE(activity_log, '[]'::jsonb) || jsonb_build_array(v_log)
    WHERE id = p_load_id;

  ELSIF p_step = 'delivery_arrived' THEN
    IF v_load.driver_milestone_loaded_at IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'complete_previous_step');
    END IF;
    IF v_load.driver_milestone_delivery_at IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_completed');
    END IF;
    v_log := jsonb_build_object('at', v_at, 'message', 'Driver: On site at delivery');
    UPDATE public.loads
    SET
      driver_milestone_delivery_at = now(),
      updated_at = now(),
      activity_log = COALESCE(activity_log, '[]'::jsonb) || jsonb_build_array(v_log)
    WHERE id = p_load_id;

  ELSIF p_step = 'bol_signed' THEN
    IF v_load.driver_milestone_delivery_at IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'complete_previous_step');
    END IF;
    IF v_load.driver_milestone_bol_at IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_completed');
    END IF;
    v_log := jsonb_build_object('at', v_at, 'message', 'Driver: Signed BOL — load complete');
    UPDATE public.loads
    SET
      driver_milestone_bol_at = now(),
      status = 'delivered',
      delivered_at = now(),
      updated_at = now(),
      activity_log = COALESCE(activity_log, '[]'::jsonb) || jsonb_build_array(v_log)
    WHERE id = p_load_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.driver_advance_load_milestone(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.driver_advance_load_milestone(uuid, text) TO authenticated;
