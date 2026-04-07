-- Driver SMS/email alert tracking + status after email-to-SMS dispatch
ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS driver_notified_at timestamptz;

COMMENT ON COLUMN public.loads.driver_notified_at IS 'When the driver received the automated SMS/email-to-SMS dispatch notification.';

ALTER TABLE public.loads DROP CONSTRAINT IF EXISTS loads_status_check;

ALTER TABLE public.loads
  ADD CONSTRAINT loads_status_check CHECK (
    status IN (
      'draft',
      'dispatched',
      'notification_sent',
      'in_transit',
      'delivered',
      'cancelled'
    )
  );
