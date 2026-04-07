import { Resend } from "resend";
import { AUTOMATED_ALERT_MAILBOX } from "@/lib/email/automated-alert-from";

/** Verified domain sender for transactional / internal mail (no Reply-To). */
const DEFAULT_FROM = `NexusFreight <${AUTOMATED_ALERT_MAILBOX}>`;

export function resendPlainConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendResendPlainText(options: {
  to: string;
  subject: string;
  text: string;
  from?: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY must be set.");
  }

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: options.from ?? DEFAULT_FROM,
    to: options.to.trim(),
    subject: options.subject.trim(),
    text: options.text,
  });

  if (error) {
    throw new Error(error.message);
  }
}
