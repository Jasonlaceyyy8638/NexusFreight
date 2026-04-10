import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  buildAnnouncementReminderEmailHtml,
  buildAnnouncementReminderPlainText,
  firstNameFromProfile,
  summaryFromBody,
} from "@/lib/admin/announcement-reminder-email-html";
import { signAnnouncementUnsubscribe } from "@/lib/admin/announcement-unsubscribe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

const IN_CHUNK = 120;

function getPublicBaseUrl(): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "https://nexusfreight.tech";
  return siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
}

const REMINDER_FROM = "Jason Lacey | NexusFreight <info@nexusfreight.tech>";

export type AnnouncementReminderEngineResult = {
  ok: boolean;
  processed_announcements: number;
  reminders_sent: number;
  skipped_no_recipients: number;
  errors: string[];
};

type SendRow = {
  id: string;
  title: string;
  body_text: string | null;
  body_excerpt: string;
  sent_at: string;
};

/**
 * For each bulk send older than 72h (and newer than 30d), email recipients who
 * were delivered the message but never opened it, and have not already received
 * this reminder. Logs each send in `announcement_reminder_log` (unique per user+announcement).
 */
export async function runAnnouncementReminderEngine(
  svc: SupabaseClient
): Promise<AnnouncementReminderEngineResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return {
      ok: false,
      processed_announcements: 0,
      reminders_sent: 0,
      skipped_no_recipients: 0,
      errors: ["RESEND_API_KEY is not configured."],
    };
  }

  const now = Date.now();
  const minAge = now - 72 * 60 * 60 * 1000;
  const maxAge = now - 30 * 24 * 60 * 60 * 1000;

  const { data: announcements, error: annErr } = await svc
    .from("product_update_send_log")
    .select("id, title, body_text, body_excerpt, sent_at")
    .lte("sent_at", new Date(minAge).toISOString())
    .gte("sent_at", new Date(maxAge).toISOString())
    .order("sent_at", { ascending: false });

  if (annErr) {
    return {
      ok: false,
      processed_announcements: 0,
      reminders_sent: 0,
      skipped_no_recipients: 0,
      errors: [annErr.message],
    };
  }

  const rows = (announcements as SendRow[] | null) ?? [];
  const resend = new Resend(resendKey);
  const base = getPublicBaseUrl().replace(/\/$/, "");
  const dashboardUrl = `${base}/dashboard`;
  const logoUrl =
    process.env.PUBLIC_LOGO_URL?.trim() || `${base}/nexusfreight-logo-v2.svg`;

  let reminders_sent = 0;
  let skipped_no_recipients = 0;
  const errors: string[] = [];

  for (const ann of rows) {
    const bodySource = (ann.body_text?.trim() || ann.body_excerpt || "").trim();
    if (!bodySource) {
      skipped_no_recipients += 1;
      continue;
    }

    const updateSummary = summaryFromBody(bodySource, 150);

    const { data: recipients, error: recErr } = await svc
      .from("announcement_send_recipients")
      .select("user_id, email")
      .eq("announcement_id", ann.id);

    if (recErr || !recipients?.length) {
      if (recErr) errors.push(`${ann.id}: recipients ${recErr.message}`);
      skipped_no_recipients += 1;
      continue;
    }

    const userIds = [
      ...new Set(
        (recipients as Array<{ user_id: string; email: string }>).map((r) => r.user_id)
      ),
    ];

    const opened = new Set<string>();
    for (const part of chunk(userIds, IN_CHUNK)) {
      const { data: openedRows } = await svc
        .from("announcement_stats")
        .select("user_id")
        .eq("announcement_id", ann.id)
        .in("user_id", part)
        .not("opened_at", "is", null);
      for (const r of (openedRows as Array<{ user_id: string }> | null) ?? []) {
        opened.add(r.user_id);
      }
    }

    const reminded = new Set<string>();
    for (const part of chunk(userIds, IN_CHUNK)) {
      const { data: remindedRows } = await svc
        .from("announcement_reminder_log")
        .select("user_id")
        .eq("announcement_id", ann.id)
        .in("user_id", part);
      for (const r of (remindedRows as Array<{ user_id: string }> | null) ?? []) {
        reminded.add(r.user_id);
      }
    }

    const profileMap = new Map<
      string,
      {
        id: string;
        full_name: string | null;
        announcement_emails_opt_out: boolean | null;
      }
    >();
    for (const part of chunk(userIds, IN_CHUNK)) {
      const { data: profiles } = await svc
        .from("profiles")
        .select("id, full_name, announcement_emails_opt_out")
        .in("id", part);
      const rows =
        (profiles ?? []) as Array<{
          id: string;
          full_name: string | null;
          announcement_emails_opt_out: boolean | null;
        }>;
      for (const p of rows) {
        profileMap.set(p.id, p);
      }
    }

    const emailByUser = new Map(
      (recipients as Array<{ user_id: string; email: string }>).map((r) => [
        r.user_id,
        r.email,
      ])
    );

    for (const uid of userIds) {
      if (opened.has(uid) || reminded.has(uid)) continue;

      const prof = profileMap.get(uid);
      if (prof?.announcement_emails_opt_out === true) continue;

      const email = emailByUser.get(uid)?.trim().toLowerCase();
      if (!email) continue;

      const { data: claim, error: claimErr } = await svc
        .from("announcement_reminder_log")
        .insert({ announcement_id: ann.id, user_id: uid })
        .select("id")
        .single();

      if (claimErr) {
        if (claimErr.code === "23505" || claimErr.message.includes("duplicate")) {
          continue;
        }
        errors.push(`${ann.id}/${uid}: claim ${claimErr.message}`);
        continue;
      }

      if (!claim?.id) {
        continue;
      }

      const claimId = claim.id as string;
      const firstName = firstNameFromProfile(prof?.full_name);
      const token = signAnnouncementUnsubscribe(uid);
      const unsubscribeUrl = `${base}/api/unsubscribe/announcements?t=${encodeURIComponent(token)}`;

      const html = buildAnnouncementReminderEmailHtml({
        firstName,
        updateTitle: ann.title,
        updateSummary,
        logoUrl,
        dashboardUrl,
        unsubscribeUrl,
      });

      const text = buildAnnouncementReminderPlainText({
        firstName,
        updateTitle: ann.title,
        updateSummary,
        dashboardUrl,
        unsubscribeUrl,
      });

      const subject = `Quick question regarding ${ann.title}...`;

      const { error: sendErr } = await resend.emails.send({
        from: REMINDER_FROM,
        to: [email],
        subject,
        html,
        text,
      });

      if (sendErr) {
        await svc.from("announcement_reminder_log").delete().eq("id", claimId);
        errors.push(`${email}: ${sendErr.message}`);
        continue;
      }

      reminders_sent += 1;
    }
  }

  return {
    ok: true,
    processed_announcements: rows.length,
    reminders_sent,
    skipped_no_recipients,
    errors: errors.slice(0, 50),
  };
}

/** For tests / scripts when service client is created externally. */
export async function runAnnouncementReminderEngineWithDefaultClient(): Promise<AnnouncementReminderEngineResult> {
  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return {
      ok: false,
      processed_announcements: 0,
      reminders_sent: 0,
      skipped_no_recipients: 0,
      errors: ["Supabase service role not configured."],
    };
  }
  return runAnnouncementReminderEngine(svc);
}
