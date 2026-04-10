import { createHash } from "node:crypto";
import { Resend } from "resend";
import { collectDistinctAuthEmails } from "@/lib/admin/announcement-recipients";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bodyToHtmlParagraphs(raw: string): string {
  const escaped = escapeHtml(raw.trim());
  return escaped
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const inner = lines.join("<br />");
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#374151;">${inner}</p>`;
    })
    .join("");
}

function buildEmailHtml(params: {
  title: string;
  bodyHtml: string;
  dashboardUrl: string;
  logoUrl: string;
}): string {
  const title = escapeHtml(params.title);
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
              <img src="${params.logoUrl}" alt="NexusFreight" width="200" height="auto" style="display:block;max-width:200px;height:auto;" />
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
              ${params.bodyHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
                <tr>
                  <td style="border-radius:8px;background:#2563eb;">
                    <a href="${params.dashboardUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">View Updates in Dashboard</a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#64748b;">You received this because you have a registered NexusFreight account.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;border-top:1px solid #2a2f36;">
              <p style="margin:0;font-size:12px;color:#64748b;">NexusFreight Logistics Infrastructure</p>
              <p style="margin:4px 0 0;font-size:11px;letter-spacing:0.08em;color:#475569;">Digital. Direct. Driven.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type ProductUpdateSendResult =
  | {
      ok: true;
      recipient_count: number;
      attempted: number;
      errors?: string[];
    }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
      errors?: string[];
    };

/**
 * Bulk product announcement: Auth emails, Resend, duplicate guard (same as Edge Function).
 */
export async function sendProductUpdateBroadcast(input: {
  title: string;
  body: string;
  confirmPhrase: string;
}): Promise<ProductUpdateSendResult> {
  const confirmPhrase =
    process.env.ANNOUNCEMENT_SEND_CONFIRM_PHRASE?.trim() || "SEND";
  if (input.confirmPhrase.trim() !== confirmPhrase) {
    return {
      ok: false,
      status: 400,
      error: `Confirmation phrase must be exactly "${confirmPhrase}".`,
    };
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return {
      ok: false,
      status: 503,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return {
      ok: false,
      status: 503,
      error: "Supabase service role not configured.",
    };
  }

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > 200) {
    return {
      ok: false,
      status: 400,
      error: "Title required (max 200 chars).",
    };
  }
  if (!body || body.length > 20000) {
    return {
      ok: false,
      status: 400,
      error: "Body required (max 20000 chars).",
    };
  }

  const payloadHash = sha256Hex(`${title}\n\n${body}`);

  try {
    const dup = await checkDuplicatePayload(svc, payloadHash);
    if (dup) {
      return {
        ok: false,
        status: 409,
        code: "DUPLICATE_PAYLOAD",
        error:
          "This exact announcement was already sent within the last hour. Change the title or body, or wait before resending.",
      };
    }
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error:
        e instanceof Error ? e.message : "Could not verify duplicate send guard.",
    };
  }

  let list: string[];
  try {
    list = await collectDistinctAuthEmails(svc);
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error: e instanceof Error ? e.message : "Could not list Auth users.",
    };
  }

  if (list.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "No recipient emails found. No Auth users with an email address.",
    };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "https://nexusfreight.tech";
  const base = siteUrl.startsWith("http")
    ? siteUrl
    : `https://${siteUrl}`;
  const dashboardUrl = `${base.replace(/\/$/, "")}/dashboard`;
  const logoUrl =
    process.env.PUBLIC_LOGO_URL?.trim() ||
    `${base.replace(/\/$/, "")}/nexusfreight-logo-v2.svg`;

  const bodyHtml = bodyToHtmlParagraphs(body);
  const html = buildEmailHtml({
    title,
    bodyHtml,
    dashboardUrl,
    logoUrl,
  });
  const emailSubject = `NexusFreight — ${title}`;

  const resend = new Resend(resendKey);
  let sent = 0;
  const errors: string[] = [];

  for (const to of list) {
    const { error: sendErr } = await resend.emails.send({
      from: "NexusFreight <info@nexusfreight.tech>",
      to: [to],
      subject: emailSubject,
      html,
      text: `${title}\n\n${body}\n\n${dashboardUrl}\n`,
    });
    if (sendErr) {
      errors.push(`${to}: ${sendErr.message}`);
      continue;
    }
    sent += 1;
  }

  if (sent > 0) {
    const { error: logErr } = await svc.from("product_update_send_log").insert({
      payload_hash: payloadHash,
      title,
      body_excerpt: body.slice(0, 500),
      recipient_count: sent,
    });
    if (logErr) {
      console.error("[product-update-send] log insert:", logErr.message);
    }
  }

  if (sent === 0 && list.length > 0) {
    return {
      ok: false,
      status: 502,
      error: errors.length ? errors.join("\n") : "No messages were delivered.",
      ...(errors.length ? { errors: errors.slice(0, 20) } : {}),
    };
  }

  return {
    ok: true,
    recipient_count: sent,
    attempted: list.length,
    ...(errors.length ? { errors: errors.slice(0, 20) } : {}),
  };
}

async function checkDuplicatePayload(
  svc: Parameters<typeof collectDistinctAuthEmails>[0],
  payloadHash: string
): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data, error } = await svc
    .from("product_update_send_log")
    .select("id")
    .eq("payload_hash", payloadHash)
    .gte("sent_at", since)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data?.id);
}
