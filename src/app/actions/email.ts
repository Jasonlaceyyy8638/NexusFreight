"use server";

import { formatAutomatedAlertFromHeader } from "@/lib/email/automated-alert-from";
import { Resend } from "resend";

/**
 * Sends a plain-text email via Resend (`RESEND_API_KEY`).
 * Defaults to automated-alerts From (`Dispatch | NexusFreight` &lt;alerts@nexusfreight.tech&gt;). Override with `RESEND_FROM_EMAIL` if needed. No Reply-To.
 */
export async function sendPlainTextEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    formatAutomatedAlertFromHeader(null);

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: to.trim(),
    subject: subject.trim(),
    text: body,
  });

  if (error) {
    throw new Error(error.message);
  }
}
