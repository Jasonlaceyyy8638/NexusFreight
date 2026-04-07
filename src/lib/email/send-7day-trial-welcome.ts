import { Resend } from "resend";

const DEFAULT_FROM = "The NexusFreight Team <info@nexusfreight.tech>";
const DEFAULT_REPLY_TO = "info@nexusfreight.tech";

const SUBJECT =
  "🚛 Your NexusFreight Command Center is Ready (7-Day Free Access)";

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

Welcome to NexusFreight! Your 7-day free trial is now active, and your dashboard is ready for action.

What's included in your trial:

The NexusFreight Shield: Our system connects to the FMCSA every night. If a carrier's authority is revoked while you sleep, they are automatically blocked in your system by 2:00 AM.

Automated Driver Alerts: Stop chasing drivers with manual texts. Send load info directly from your dashboard.

Real-Time Vetting: Use our FMCSA search to pull active authority dates and safety data instantly.

No Credit Card Required:
We want you to see the power of this platform without any hurdles. You have full premium access for the next 7 days.

Need help?
Just reply to this email or contact us at info@nexusfreight.tech. We're here to help you move more loads with less stress.

Safe driving,
The NexusFreight Team`;

  const p = (s: string) =>
    `<p style="margin:0 0 16px;line-height:1.6;color:#1a1a1a;">${s}</p>`;
  const li = (bold: string, rest: string) =>
    `<li style="margin:0 0 12px;line-height:1.6;color:#1a1a1a;"><strong>${bold}</strong> ${rest}</li>`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;max-width:42em;margin:0 auto;padding:24px;">
${p(`Hello ${escapeHtml(safeName)},`)}
${p("Welcome to NexusFreight! Your <strong>7-day free trial</strong> is now active, and your dashboard is ready for action.")}
${p("<strong>What’s included in your trial:</strong>")}
<ul style="margin:0 0 16px;padding-left:1.25em;">
${li("The NexusFreight Shield:", "Our system connects to the FMCSA every night. If a carrier’s authority is revoked while you sleep, they are automatically blocked in your system by 2:00 AM.")}
${li("Automated Driver Alerts:", "Stop chasing drivers with manual texts. Send load info directly from your dashboard.")}
${li("Real-Time Vetting:", "Use our FMCSA search to pull active authority dates and safety data instantly.")}
</ul>
${p("<strong>No Credit Card Required:</strong><br>We want you to see the power of this platform without any hurdles. You have full premium access for the next <strong>7 days</strong>.")}
${p('Need help?<br>Just reply to this email or contact us at <a href="mailto:info@nexusfreight.tech">info@nexusfreight.tech</a>. We’re here to help you move more loads with less stress.')}
${p("Safe driving,<br><strong>The NexusFreight Team</strong>")}
</body>
</html>`.trim();

  return { text, html };
}

export async function send7DayTrialWelcomeEmail(options: {
  to: string;
  displayName: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY must be set.");
  }

  const from =
    process.env.TRIAL_WELCOME_FROM_EMAIL?.trim() || DEFAULT_FROM;
  const replyTo =
    process.env.TRIAL_WELCOME_REPLY_TO?.trim() || DEFAULT_REPLY_TO;

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
