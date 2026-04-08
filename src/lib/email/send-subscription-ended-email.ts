import { Resend } from "resend";

const DEFAULT_FROM = "The NexusFreight Team <info@nexusfreight.tech>";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function subscriptionEndedEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * Sent once when a Stripe subscription ends (trial over without payment, cancel, unpaid).
 * Includes links to monthly and yearly pricing checkout (sign-in required).
 */
export async function sendSubscriptionEndedEmail(options: {
  to: string;
  displayName: string;
  origin: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY must be set.");
  }

  const base = options.origin.replace(/\/$/, "");
  const subscribeUrl = `${base}/trial-expired`;
  const yearlyHintUrl = `${base}/trial-expired?plan=yearly`;
  const safeName = options.displayName.trim() || "there";

  const text = `Hello ${safeName},

Your NexusFreight trial or subscription is no longer active. To keep full access to your command center, loads, fleet, and settlements, sign in and subscribe:

${subscribeUrl}

On that page you can choose monthly or yearly billing before checkout. Yearly direct link: ${yearlyHintUrl}

Sign in with the same email you used for NexusFreight.

Questions? Reply to this email or contact info@nexusfreight.tech.

— The NexusFreight Team`;

  const p = (s: string) =>
    `<p style="margin:0 0 16px;line-height:1.6;color:#1a1a1a;">${s}</p>`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;max-width:42em;margin:0 auto;padding:24px;">
${p(`Hello ${escapeHtml(safeName)},`)}
${p("Your NexusFreight trial or subscription is no longer active. To restore full access, sign in with the same email and complete checkout.")}
<p style="margin:0 0 20px;line-height:1.6;color:#1a1a1a;">
  <a href="${escapeHtml(subscribeUrl)}" style="display:inline-block;background:#007bff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">Subscribe (monthly or yearly)</a>
</p>
${p(`Prefer yearly? <a href="${escapeHtml(yearlyHintUrl)}">Open checkout with yearly pre-selected</a>.`)}
${p("Questions? Reply to this email or contact info@nexusfreight.tech.")}
<p style="margin:24px 0 0;font-size:14px;color:#64748b;">— The NexusFreight Team</p>
</body>
</html>`;

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: options.to,
    subject: "Your NexusFreight access has ended — subscribe to continue",
    text,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
