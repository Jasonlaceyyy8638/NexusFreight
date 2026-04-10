import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  title?: string;
  body?: string;
  confirmPhrase?: string;
};

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Must match src/lib/admin/announcement-unsubscribe.ts (Node crypto). */
async function signAnnouncementUnsubscribe(
  profileId: string,
  secret: string
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
  const payload = JSON.stringify({ p: profileId, exp });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  const sig = base64UrlEncode(new Uint8Array(sigBuf));
  const b64 = base64UrlEncode(new TextEncoder().encode(payload));
  return `${b64}.${sig}`;
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
  unsubscribeUrl: string;
  postalAddress: string;
}): string {
  const title = escapeHtml(params.title);
  const postal = escapeHtml(params.postalAddress);
  const unsub = `<a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> from product update emails`;
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
              <p style="margin:0;font-size:12px;line-height:1.55;color:#64748b;">${postal}</p>
              <p style="margin:12px 0 0;font-size:11px;line-height:1.5;color:#94a3b8;">${unsub}</p>
              <p style="margin:16px 0 0;font-size:12px;color:#64748b;">NexusFreight Logistics Infrastructure</p>
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const resendKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const confirmPhrase =
    Deno.env.get("ANNOUNCEMENT_SEND_CONFIRM_PHRASE")?.trim() || "SEND";
  const siteUrl =
    Deno.env.get("PUBLIC_SITE_URL")?.trim() || "https://nexusfreight.tech";
  const logoUrl =
    Deno.env.get("PUBLIC_LOGO_URL")?.trim() ||
    `${siteUrl.replace(/\/$/, "")}/nexusfreight-logo-v2.svg`;
  const postalAddress =
    Deno.env.get("NEXUSFREIGHT_POSTAL_ADDRESS")?.trim() ||
    "NexusFreight · Digital logistics platform · https://nexusfreight.tech";
  const unsubSecret =
    Deno.env.get("ANNOUNCEMENT_UNSUBSCRIBE_SECRET")?.trim() || serviceKey || "";

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured (Supabase)." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Forbidden." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let parsed: Body;
  try {
    parsed = (await req.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const title = (parsed.title ?? "").trim();
  const body = (parsed.body ?? "").trim();
  const phrase = (parsed.confirmPhrase ?? "").trim();

  if (!title || title.length > 200) {
    return new Response(JSON.stringify({ error: "Title required (max 200 chars)." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!body || body.length > 20000) {
    return new Response(
      JSON.stringify({ error: "Body required (max 20000 chars)." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (phrase !== confirmPhrase) {
    return new Response(
      JSON.stringify({
        error: `Confirmation phrase must be exactly "${confirmPhrase}".`,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const payloadHash = await sha256Hex(`${title}\n\n${body}`);
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: recent, error: dupErr } = await supabase
    .from("product_update_send_log")
    .select("id")
    .eq("payload_hash", payloadHash)
    .gte("sent_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .limit(1)
    .maybeSingle();

  if (dupErr) {
    console.error("[send-product-update] dup check:", dupErr.message);
    return new Response(JSON.stringify({ error: dupErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (recent?.id) {
    return new Response(
      JSON.stringify({
        error:
          "This exact announcement was already sent within the last hour. Change the title or body, or wait before resending.",
        code: "DUPLICATE_PAYLOAD",
      }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function authEmailByUserId(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    let page = 1;
    const perPage = 1000;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        const em = u.email?.trim().toLowerCase();
        if (!em || !emailRe.test(em)) continue;
        const bannedUntil = u.banned_until;
        if (
          bannedUntil &&
          !Number.isNaN(new Date(bannedUntil).getTime()) &&
          new Date(bannedUntil) > new Date()
        ) {
          continue;
        }
        map.set(u.id, em);
      }
      if (data.users.length < perPage) break;
      page += 1;
    }
    return map;
  }

  const [authEmails, profileResult] = await Promise.all([
    authEmailByUserId(),
    supabase.from("profiles").select("id, auth_email, announcement_emails_opt_out"),
  ]);

  const { data: profileRows, error: qErr } = profileResult;

  if (qErr || !profileRows) {
    return new Response(JSON.stringify({ error: qErr?.message ?? "Query failed." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const byEmail = new Map<
    string,
    { profileId: string; email: string }
  >();

  for (const r of profileRows as Array<{
    id: string;
    auth_email: string | null;
    announcement_emails_opt_out: boolean | null;
  }>) {
    if (r.announcement_emails_opt_out === true) continue;
    const fromProfile = r.auth_email?.trim().toLowerCase();
    const fromAuth = authEmails.get(r.id);
    const em =
      fromProfile && emailRe.test(fromProfile)
        ? fromProfile
        : fromAuth && emailRe.test(fromAuth)
          ? fromAuth
          : "";
    if (!em) continue;
    if (!byEmail.has(em)) {
      byEmail.set(em, { profileId: r.id, email: em });
    }
  }

  const recipients = [...byEmail.values()];
  if (recipients.length === 0) {
    return new Response(
      JSON.stringify({
        error:
          "No recipient emails found. Users need a valid Auth email (or profiles.auth_email) and must not have opted out.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const base = siteUrl.replace(/\/$/, "");
  const dashboardUrl = `${base}/dashboard`;
  const bodyHtml = bodyToHtmlParagraphs(body);
  const emailSubject = `NexusFreight — ${title}`;

  let sent = 0;
  const errors: string[] = [];

  for (const { profileId, email } of recipients) {
    const tok = await signAnnouncementUnsubscribe(profileId, unsubSecret);
    const unsubscribeUrl = `${base}/api/unsubscribe/announcements?t=${encodeURIComponent(tok)}`;
    const html = buildEmailHtml({
      title,
      bodyHtml,
      dashboardUrl,
      logoUrl,
      unsubscribeUrl,
      postalAddress,
    });
    const text = `${title}\n\n${body}\n\n${dashboardUrl}\n\n${postalAddress}\n\nUnsubscribe: ${unsubscribeUrl}\n`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NexusFreight <info@nexusfreight.tech>",
        to: [email],
        subject: emailSubject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      errors.push(`${email}: ${errText.slice(0, 200)}`);
      continue;
    }
    sent += 1;
  }

  if (sent > 0) {
    const { error: logErr } = await supabase.from("product_update_send_log").insert({
      payload_hash: payloadHash,
      title,
      body_excerpt: body.slice(0, 500),
      recipient_count: sent,
    });
    if (logErr) {
      console.error("[send-product-update] log insert:", logErr.message);
    }
  }

  const status = sent === 0 && recipients.length > 0 ? 502 : 200;

  return new Response(
    JSON.stringify({
      ok: sent > 0,
      recipient_count: sent,
      attempted: recipients.length,
      errors: errors.length ? errors.slice(0, 20) : undefined,
    }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
