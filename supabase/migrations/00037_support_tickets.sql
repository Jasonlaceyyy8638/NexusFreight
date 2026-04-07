-- Corporate support tickets + private screenshot storage (paths: {user_id}/{ticket_id}.ext)

CREATE TYPE public.support_ticket_status AS ENUM ('Open', 'In Progress', 'Resolved');
CREATE TYPE public.support_ticket_priority AS ENUM ('Low', 'Medium', 'High');

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  status public.support_ticket_status NOT NULL DEFAULT 'Open',
  priority public.support_ticket_priority NOT NULL DEFAULT 'Medium',
  screenshot_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_tickets_user_id_created_at_idx
  ON public.support_tickets (user_id, created_at DESC);

COMMENT ON TABLE public.support_tickets IS 'User-submitted support requests; screenshot_url stores storage object path within support-tickets bucket.';
COMMENT ON COLUMN public.support_tickets.screenshot_url IS 'Path inside support-tickets bucket: {user_id}/{ticket_id}.{ext}';

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_tickets_select_own"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "support_tickets_insert_own"
  ON public.support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "support_tickets_update_own"
  ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.support_tickets_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE PROCEDURE public.support_tickets_set_updated_at();

-- Storage (private): support-tickets / {user_id}/{filename}
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-tickets', 'support-tickets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "support_tickets_storage_select_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-tickets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "support_tickets_storage_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-tickets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "support_tickets_storage_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'support-tickets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "support_tickets_storage_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'support-tickets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
