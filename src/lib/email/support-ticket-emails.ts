import { Resend } from "resend";
import { ticketPublicRef } from "@/lib/support/ticket-ref";

const SUPPORT_FROM = "NexusFreight Support <info@nexusfreight.tech>";

function resendKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null;
}

export function supportTicketEmailsConfigured(): boolean {
  return Boolean(resendKey());
}

export async function sendSupportTicketUserConfirmation(options: {
  to: string;
  ticketId: string;
}): Promise<void> {
  const key = resendKey();
  if (!key) return;

  const ref = ticketPublicRef(options.ticketId);
  const subject = `Ticket #${ref} Received — NexusFreight Support`;
  const text = `Hello,

Ticket #${ref} Received. Our support team is reviewing your request.

Reference: ${options.ticketId}

— NexusFreight Support`;

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: SUPPORT_FROM,
    to: options.to.trim(),
    subject,
    text,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function sendSupportTicketInternalAlert(options: {
  ticketId: string;
  userEmail: string;
  subject: string;
  description: string;
  priority: string;
  screenshotSignedUrl: string | null;
  dashboardUrl: string;
}): Promise<void> {
  const key = resendKey();
  if (!key) return;

  const notifyTo =
    process.env.SUPPORT_NOTIFY_EMAIL?.trim() || "info@nexusfreight.tech";
  const ref = ticketPublicRef(options.ticketId);
  const urgent = options.priority === "High";
  const subject = `${
    urgent ? "[HIGH PRIORITY] " : ""
  }New support ticket #${ref} — ${options.subject.slice(0, 80)}`;

  const shot = options.screenshotSignedUrl
    ? `Screenshot (signed link, 7 days): ${options.screenshotSignedUrl}\n`
    : "Screenshot: none attached\n";

  const text = `New support ticket

Ticket ref: #${ref}
Full ID: ${options.ticketId}
Priority: ${options.priority}
From: ${options.userEmail}
Subject: ${options.subject}

Description:
${options.description}

${shot}
Dashboard: ${options.dashboardUrl}`;

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: SUPPORT_FROM,
    to: notifyTo,
    subject,
    text,
  });
  if (error) {
    throw new Error(error.message);
  }
}
