/**
 * Master HTML for autonomous 72h unread reminders (Resend).
 * Placeholders: {{first_name}}, {{update_title}}, {{update_summary}}
 */

import {
  defaultPostalAddress,
  escapeHtml,
} from "@/lib/admin/announcement-email-html";

export type ReminderEmailParams = {
  firstName: string;
  updateTitle: string;
  updateSummary: string;
  logoUrl: string;
  dashboardUrl: string;
  unsubscribeUrl: string;
  postalAddress?: string;
};

export function buildAnnouncementReminderEmailHtml(p: ReminderEmailParams): string {
  const first = escapeHtml(p.firstName);
  const title = escapeHtml(p.updateTitle);
  const summary = escapeHtml(p.updateSummary);
  const postal = escapeHtml(p.postalAddress ?? defaultPostalAddress());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f1114;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f1114;padding:24px 12px 40px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
          <tr>
            <td style="padding:0 0 24px;text-align:center;">
              <img src="${escapeHtml(p.logoUrl)}" alt="NexusFreight" width="200" height="auto" style="display:block;max-width:200px;height:auto;margin:0 auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="background:#16181a;border:1px solid #2a2f36;border-radius:12px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 24px 8px 24px;">
                    <p style="margin:0;font-size:16px;line-height:1.65;color:#e2e8f0;">Hi ${first},</p>
                    <p style="margin:16px 0 0;font-size:15px;line-height:1.65;color:#cbd5e1;">
                      We noticed you may not have seen our recent update — here&apos;s a quick recap:
                    </p>
                    <p style="margin:20px 0 0;font-size:18px;font-weight:700;line-height:1.35;color:#f8fafc;">${title}</p>
                    <p style="margin:12px 0 0;font-size:15px;line-height:1.65;color:#94a3b8;">${summary}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 24px 28px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
                      <tr>
                        <td style="border-radius:8px;background:#2563eb;">
                          <a href="${escapeHtml(p.dashboardUrl)}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Open your dashboard</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#64748b;">You received this because you have a NexusFreight account and have not opened the original product announcement email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px 24px 24px;border-top:1px solid #2a2f36;">
                    <p style="margin:0;font-size:12px;line-height:1.55;color:#64748b;">${postal}</p>
                    <p style="margin:12px 0 0;font-size:11px;line-height:1.5;color:#94a3b8;">
                      <a href="${escapeHtml(p.unsubscribeUrl)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> from product update emails
                    </p>
                    <p style="margin:16px 0 0;font-size:12px;color:#64748b;">NexusFreight Logistics Infrastructure</p>
                    <p style="margin:4px 0 0;font-size:11px;letter-spacing:0.08em;color:#475569;">Digital. Direct. Driven.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildAnnouncementReminderPlainText(p: {
  firstName: string;
  updateTitle: string;
  updateSummary: string;
  dashboardUrl: string;
  unsubscribeUrl: string;
  postalAddress?: string;
}): string {
  const postal = p.postalAddress ?? defaultPostalAddress();
  return [
    `Hi ${p.firstName},`,
    "",
    "We noticed you may not have seen our recent update — here's a quick recap:",
    "",
    p.updateTitle,
    "",
    p.updateSummary,
    "",
    p.dashboardUrl,
    "",
    postal,
    "",
    `Unsubscribe: ${p.unsubscribeUrl}`,
  ].join("\n");
}

export function firstNameFromProfile(fullName: string | null | undefined): string {
  const t = fullName?.trim();
  if (!t) return "there";
  const first = t.split(/\s+/)[0];
  return first?.length ? first : "there";
}

export function summaryFromBody(body: string, maxLen = 150): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLen) return flat;
  return `${flat.slice(0, maxLen).trim()}…`;
}
