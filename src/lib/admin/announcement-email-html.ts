/**
 * Shared HTML for product announcement emails (Next.js send + admin preview iframe).
 */

import {
  buildClickTrackUrl,
  buildOpenPixelUrl,
} from "@/lib/admin/announcement-tracking";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function bodyToHtmlParagraphs(raw: string): string {
  const escaped = escapeHtml(raw.trim());
  return escaped
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const inner = lines.join("<br />");
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#374151;">${inner}</p>`;
    })
    .join("");
}

export function defaultPostalAddress(): string {
  return (
    process.env.NEXUSFREIGHT_POSTAL_ADDRESS?.trim() ||
    "NexusFreight · Digital logistics platform · https://nexusfreight.tech"
  );
}

export type ProductUpdateEmailParams = {
  title: string;
  bodyText: string;
  dashboardUrl: string;
  logoUrl: string;
  /** Full URL for unsubscribe (per recipient) or placeholder for preview. */
  unsubscribeUrl: string;
  postalAddress?: string;
  /** When true, shows a subtle “Preview” note in the footer area. */
  isPreview?: boolean;
  /** Live sends only: open pixel + wrapped links for analytics. */
  tracking?: {
    appBaseUrl: string;
    announcementId: string;
    profileId: string;
  };
};

export function buildProductUpdateEmailHtml(p: ProductUpdateEmailParams): string {
  const title = escapeHtml(p.title);
  const bodyHtml = bodyToHtmlParagraphs(p.bodyText);
  const postal = escapeHtml(p.postalAddress ?? defaultPostalAddress());
  const tr = p.tracking;
  const dashboardHref =
    tr && !p.isPreview
      ? buildClickTrackUrl(
          tr.appBaseUrl,
          tr.announcementId,
          tr.profileId,
          p.dashboardUrl
        )
      : p.dashboardUrl;
  const unsubscribeHref =
    tr && p.unsubscribeUrl && !p.isPreview
      ? buildClickTrackUrl(
          tr.appBaseUrl,
          tr.announcementId,
          tr.profileId,
          p.unsubscribeUrl
        )
      : p.unsubscribeUrl;
  const unsub = unsubscribeHref
    ? `<a href="${escapeHtml(unsubscribeHref)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> from product update emails`
    : `<span style="color:#64748b;">Unsubscribe link will appear in live sends</span>`;

  const previewNote = p.isPreview
    ? `<p style="margin:0 0 12px;font-size:11px;color:#94a3b8;">Preview — not sent</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#0f1114;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f1114;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#16181a;border:1px solid #2a2f36;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #2a2f36;">
              <img src="${p.logoUrl}" alt="NexusFreight" width="200" height="auto" style="display:block;max-width:200px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#3b82f6;">What&apos;s New</p>
              <h1 style="margin:10px 0 0;font-size:22px;font-weight:700;color:#f8fafc;line-height:1.3;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px 32px;">
              ${bodyHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
                <tr>
                  <td style="border-radius:8px;background:#2563eb;">
                    <a href="${escapeHtml(dashboardHref)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">View Updates in Dashboard</a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#64748b;">You received this because you have a registered NexusFreight account.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;border-top:1px solid #2a2f36;">
              ${previewNote}
              <p style="margin:0;font-size:12px;line-height:1.55;color:#64748b;">${postal}</p>
              <p style="margin:12px 0 0;font-size:11px;line-height:1.5;color:#94a3b8;">${unsub}</p>
              <p style="margin:16px 0 0;font-size:12px;color:#64748b;">NexusFreight Logistics Infrastructure</p>
              <p style="margin:4px 0 0;font-size:11px;letter-spacing:0.08em;color:#475569;">Digital. Direct. Driven.</p>
              ${
                tr && !p.isPreview
                  ? `<img src="${escapeHtml(
                      buildOpenPixelUrl(
                        tr.appBaseUrl,
                        tr.announcementId,
                        tr.profileId
                      )
                    )}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;outline:none;margin:0;padding:0;line-height:0;font-size:0;" />`
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildProductUpdatePlainText(params: {
  title: string;
  bodyText: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
  postalAddress?: string;
}): string {
  const lines = [
    params.title,
    "",
    params.bodyText.trim(),
    "",
    params.dashboardUrl,
    "",
    params.postalAddress ?? defaultPostalAddress(),
  ];
  if (params.unsubscribeUrl) {
    lines.push("", `Unsubscribe: ${params.unsubscribeUrl}`);
  }
  return lines.join("\n");
}
