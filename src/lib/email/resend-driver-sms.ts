import { Resend } from "resend";
import { formatAutomatedAlertFromHeader } from "@/lib/email/automated-alert-from";

export function resendDriverSmsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * Plain-text email to carrier SMS gateways via Resend. No `replyTo`.
 * `dispatcherFullName` comes from the signed-in profile (`profiles.full_name`).
 */
export async function sendDriverSmsEmailViaResend(options: {
  to: string;
  subject: string;
  text: string;
  dispatcherFullName: string | null | undefined;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY must be set.");
  }

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: formatAutomatedAlertFromHeader(options.dispatcherFullName),
    to: options.to.trim(),
    subject: options.subject.trim(),
    text: options.text,
  });

  if (error) {
    throw new Error(error.message);
  }
}
