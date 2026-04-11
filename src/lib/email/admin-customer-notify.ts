import { Resend } from "resend";

const FROM = "NexusFreight <info@nexusfreight.tech>";

function key(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null;
}

export async function sendRefundProcessedEmail(to: string): Promise<void> {
  const k = key();
  if (!k) return;
  const resend = new Resend(k);
  const { error } = await resend.emails.send({
    from: FROM,
    to: to.trim(),
    subject: "Your refund from NexusFreight",
    text: `Hello,

We've processed your refund. Please allow 3-5 days for your bank to update.

— NexusFreight`,
  });
  if (error) throw new Error(error.message);
}

export async function sendCreditAddedEmail(
  to: string,
  amountUsd: string
): Promise<void> {
  const k = key();
  if (!k) return;
  const resend = new Resend(k);
  const { error } = await resend.emails.send({
    from: FROM,
    to: to.trim(),
    subject: "Account credit applied — NexusFreight",
    text: `Hello,

A credit of $${amountUsd} has been applied to your NexusFreight account and will be applied to your next invoice.

— NexusFreight`,
  });
  if (error) throw new Error(error.message);
}

export async function sendAccountCanceledEmail(to: string): Promise<void> {
  const k = key();
  if (!k) return;
  const resend = new Resend(k);
  const { error } = await resend.emails.send({
    from: FROM,
    to: to.trim(),
    subject: "Your NexusFreight subscription has been canceled",
    text: `Hello,

Your paid NexusFreight subscription has been canceled. You will not be charged again for that subscription.

If you did not request this change, reply to this email and we will help.

— NexusFreight`,
  });
  if (error) throw new Error(error.message);
}

/** After admin trial end override on the customer profile (dashboard access window). */
export async function sendTrialUpdatedEmail(
  to: string,
  trialEndsAtIso: string
): Promise<void> {
  const k = key();
  if (!k) return;
  const resend = new Resend(k);
  const when = new Date(trialEndsAtIso);
  const human = Number.isNaN(when.getTime())
    ? trialEndsAtIso
    : when.toLocaleString(undefined, {
        dateStyle: "long",
        timeStyle: "short",
      });
  const { error } = await resend.emails.send({
    from: FROM,
    to: to.trim(),
    subject: "Your NexusFreight trial access has been updated",
    text: `Hello,

Your NexusFreight trial access end date has been updated by our team.

New access end (UTC): ${trialEndsAtIso}
(${human} in your local timezone if your device is set correctly.)

If you have questions, reply to this email.

— NexusFreight`,
  });
  if (error) throw new Error(error.message);
}
