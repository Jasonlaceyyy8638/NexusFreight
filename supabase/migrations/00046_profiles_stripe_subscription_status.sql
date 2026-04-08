-- Sync Stripe subscription.status for access control + one-shot "trial ended" email
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_ended_email_sent_at timestamptz;

COMMENT ON COLUMN public.profiles.stripe_subscription_status IS
  'Stripe subscription.status (active, trialing, past_due, canceled, …). Updated via webhooks.';
COMMENT ON COLUMN public.profiles.subscription_ended_email_sent_at IS
  'When the automated “subscription ended / resubscribe” Resend email was sent (once per account).';
