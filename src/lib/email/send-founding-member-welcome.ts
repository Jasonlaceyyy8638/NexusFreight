import { Resend } from "resend";

const DEFAULT_FROM = "Jason Lacey <info@nexusfreight.tech>";
const DEFAULT_REPLY_TO = "info@nexusfreight.tech";

const SUBJECT =
  "🚀 Welcome to the NexusFreight Family (Founding Member Access)";

export function foundingWelcomeResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildBodies(displayName: string): { text: string; html: string } {
  const safeName = displayName.trim() || "there";

  const text = `Hello ${safeName},

You’re officially in. You are one of our first 5 Founding Members, which means you have full, unrestricted access to the NexusFreight dashboard for the next 45 days—completely free.

No credit card required. No strings attached.

Why are we doing this? We aren't just building another software tool; we’re building a command center for the road. As a Beta user, you are our eyes and ears.

The Beta Mission:
If you see something that looks "off," a typo, or a feature that could be better:

Snap a photo or screenshot.

Reply to this email or send it to info@nexusfreight.tech.

Your feedback goes directly to the development team (me). Let's build the future of logistics together.

Welcome to the fleet,
Jason Lacey
Founder, NexusFreight`;

  const p = (s: string) => `<p style="margin:0 0 16px;line-height:1.6;color:#1a1a1a;">${s}</p>`;
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;max-width:42em;margin:0 auto;padding:24px;">
${p(`Hello ${escapeHtml(safeName)},`)}
${p("You’re officially in. You are one of our first 5 <strong>Founding Members</strong>, which means you have full, unrestricted access to the NexusFreight dashboard for the next 45 days—completely free.")}
${p("<strong>No credit card required. No strings attached.</strong>")}
${p('Why are we doing this? We aren\'t just building another software tool; we’re building a <strong>command center for the road</strong>. As a Beta user, you are our eyes and ears.')}
${p("<strong>The Beta Mission:</strong><br>If you see something that looks \"off,\" a typo, or a feature that could be better:")}
${p("Snap a photo or screenshot.")}
${p('Reply to this email or send it to <a href="mailto:info@nexusfreight.tech">info@nexusfreight.tech</a>.')}
${p("Your feedback goes directly to the development team (me). Let's build the future of logistics together.")}
${p("Welcome to the fleet,<br><strong>Jason Lacey</strong><br><span style=\"color:#444;\">Founder, NexusFreight</span>")}
</body>
</html>`.trim();

  return { text, html };
}

export async function sendFoundingMemberWelcomeEmail(options: {
  to: string;
  displayName: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY must be set.");
  }

  const from =
    process.env.FOUNDING_WELCOME_FROM_EMAIL?.trim() || DEFAULT_FROM;
  const replyTo =
    process.env.FOUNDING_WELCOME_REPLY_TO?.trim() || DEFAULT_REPLY_TO;

  const { text, html } = buildBodies(options.displayName);

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: options.to.trim(),
    replyTo,
    subject: SUBJECT,
    text,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
