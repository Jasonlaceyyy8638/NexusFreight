/** NexusFreight brand: #1A1C1E (surface), #3B82F6 (accent). */

const BG = "#1A1C1E";
const ACCENT = "#3B82F6";
const MUTED = "#94a3b8";

export function eldInviteEmailHtml(params: {
  carrierName: string;
  agencyName: string;
  magicLink: string;
}): string {
  const { carrierName, agencyName, magicLink } = params;
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${BG};font-family:system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#16181a;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em;">NexusFreight</p>
              <p style="margin:6px 0 0;font-size:11px;font-weight:600;color:${ACCENT};letter-spacing:0.2em;">ELD CONNECT</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;">
              <p style="margin:0;font-size:15px;line-height:1.55;color:#e2e8f0;">
                Hello <strong style="color:#fff;">${escapeHtml(carrierName)}</strong>,
              </p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.55;color:#e2e8f0;">
                Click below to select your ELD provider and sync your fleet with <strong style="color:#fff;">${escapeHtml(agencyName)}</strong>.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 0;">
                <tr>
                  <td style="border-radius:8px;background:${ACCENT};">
                    <a href="${escapeAttr(magicLink)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">Select provider &amp; connect</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:${MUTED};">
                This secure link expires in 48 hours. If you did not expect this email, you can ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
