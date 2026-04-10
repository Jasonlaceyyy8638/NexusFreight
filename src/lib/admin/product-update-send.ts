import { createHash, randomUUID } from "node:crypto";
import { Resend } from "resend";
import {
  buildProductUpdateEmailHtml,
  buildProductUpdatePlainText,
} from "@/lib/admin/announcement-email-html";
import { collectAnnouncementRecipients } from "@/lib/admin/announcement-recipients";
import { signAnnouncementUnsubscribe } from "@/lib/admin/announcement-unsubscribe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function getPublicBaseUrl(): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "https://nexusfreight.tech";
  return siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
}

export type ProductUpdateSendResult =
  | {
      ok: true;
      recipient_count: number;
      attempted: number;
      /** Set for bulk broadcast (product_update_send_log id). */
      announcement_id?: string;
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
 * Bulk product announcement: profiles + email + opt-out, Resend, per-user unsubscribe link.
 */
export async function sendProductUpdateBroadcast(input: {
  title: string;
  body: string;
  confirmPhrase: string;
  /** When set, only these profile ids receive the send (subset of normal recipients). */
  onlyProfileIds?: ReadonlySet<string> | null;
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

  let recipients: Awaited<ReturnType<typeof collectAnnouncementRecipients>>;
  try {
    recipients = await collectAnnouncementRecipients(svc);
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error:
        e instanceof Error ? e.message : "Could not load announcement recipients.",
    };
  }

  if (recipients.length === 0) {
    return {
      ok: false,
      status: 400,
      error:
        "No recipients: add auth_email on profiles or ensure users have not opted out.",
    };
  }

  if (input.onlyProfileIds && input.onlyProfileIds.size > 0) {
    recipients = recipients.filter((r) => input.onlyProfileIds!.has(r.profileId));
  }

  if (recipients.length === 0) {
    return {
      ok: false,
      status: 400,
      error:
        "No recipients matched this send (e.g. no inactive users for re-engagement).",
    };
  }

  const base = getPublicBaseUrl().replace(/\/$/, "");
  const dashboardUrl = `${base}/dashboard`;
  const logoUrl =
    process.env.PUBLIC_LOGO_URL?.trim() || `${base}/nexusfreight-logo-v2.svg`;

  /** Stable id for tracking URLs and FK for `announcement_send_recipients`. */
  const announcementId = randomUUID();

  const { error: logPreErr } = await svc.from("product_update_send_log").insert({
    id: announcementId,
    payload_hash: payloadHash,
    title,
    body_excerpt: body.slice(0, 500),
    body_text: body,
    recipient_count: 0,
  });

  if (logPreErr) {
    return {
      ok: false,
      status: 500,
      error:
        logPreErr.message ||
        "Could not create announcement row (required for tracking and reminders).",
    };
  }

  const emailSubject = `NexusFreight — ${title}`;
  const resend = new Resend(resendKey);
  let sent = 0;
  const errors: string[] = [];
  const delivered: Array<{ profileId: string; email: string }> = [];

  for (const { profileId, email } of recipients) {
    const token = signAnnouncementUnsubscribe(profileId);
    const unsubscribeUrl = `${base}/api/unsubscribe/announcements?t=${encodeURIComponent(token)}`;

    const html = buildProductUpdateEmailHtml({
      title,
      bodyText: body,
      dashboardUrl,
      logoUrl,
      unsubscribeUrl,
      tracking: {
        appBaseUrl: base,
        announcementId,
        profileId,
      },
    });

    const text = buildProductUpdatePlainText({
      title,
      bodyText: body,
      dashboardUrl,
      unsubscribeUrl,
    });

    const { error: sendErr } = await resend.emails.send({
      from: "NexusFreight <info@nexusfreight.tech>",
      to: [email],
      subject: emailSubject,
      html,
      text,
    });
    if (sendErr) {
      errors.push(`${email}: ${sendErr.message}`);
      continue;
    }
    sent += 1;
    delivered.push({ profileId, email });
  }

  if (sent === 0) {
    await svc.from("product_update_send_log").delete().eq("id", announcementId);
    return {
      ok: false,
      status: 502,
      error: errors.length ? errors.join("\n") : "No messages were delivered.",
      ...(errors.length ? { errors: errors.slice(0, 20) } : {}),
    };
  }

  const recipientRows = delivered.map((d) => ({
    announcement_id: announcementId,
    user_id: d.profileId,
    email: d.email.trim().toLowerCase(),
  }));

  const { error: recErr } = await svc
    .from("announcement_send_recipients")
    .insert(recipientRows);

  if (recErr) {
    console.error("[product-update-send] announcement_send_recipients:", recErr.message);
  }

  const { error: logUpdErr } = await svc
    .from("product_update_send_log")
    .update({ recipient_count: sent })
    .eq("id", announcementId);

  if (logUpdErr) {
    console.error("[product-update-send] log update:", logUpdErr.message);
  }

  return {
    ok: true,
    recipient_count: sent,
    attempted: recipients.length,
    announcement_id: announcementId,
    ...(errors.length ? { errors: errors.slice(0, 20) } : {}),
  };
}

export async function sendProductUpdateTestEmail(input: {
  title: string;
  body: string;
  toEmail: string;
}): Promise<ProductUpdateSendResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return {
      ok: false,
      status: 503,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) {
    return {
      ok: false,
      status: 400,
      error: "Title and body are required.",
    };
  }

  const base = getPublicBaseUrl().replace(/\/$/, "");
  const dashboardUrl = `${base}/dashboard`;
  const logoUrl =
    process.env.PUBLIC_LOGO_URL?.trim() || `${base}/nexusfreight-logo-v2.svg`;

  const html = buildProductUpdateEmailHtml({
    title,
    bodyText: body,
    dashboardUrl,
    logoUrl,
    unsubscribeUrl: `${base}/api/unsubscribe/announcements?preview=1`,
    isPreview: true,
  });

  const text = buildProductUpdatePlainText({
    title,
    bodyText: body,
    dashboardUrl,
  });

  const resend = new Resend(resendKey);
  const { error: sendErr } = await resend.emails.send({
    from: "NexusFreight <info@nexusfreight.tech>",
    to: [input.toEmail.trim().toLowerCase()],
    subject: `[TEST] NexusFreight — ${title}`,
    html,
    text: `[TEST]\n\n${text}`,
  });

  if (sendErr) {
    return {
      ok: false,
      status: 502,
      error: sendErr.message,
    };
  }

  return {
    ok: true,
    recipient_count: 1,
    attempted: 1,
  };
}

async function checkDuplicatePayload(
  svc: NonNullable<ReturnType<typeof createServiceRoleSupabaseClient>>,
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
