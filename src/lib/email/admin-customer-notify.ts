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
    subject: "Your NexusFreight account has been closed",
    text: `Hello,

Your account has been closed. We're sorry to see you go—is there anything we could have done better?

Reply to this email if you'd like to share feedback.

— NexusFreight`,
  });
  if (error) throw new Error(error.message);
}
