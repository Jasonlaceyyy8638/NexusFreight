import type { SupabaseClient } from "@supabase/supabase-js";
import { listInactiveAnnouncementRecipients } from "@/lib/admin/announcement-reengagement";
import type {
  AnnouncementsAnalyticsDashboardData,
  EmailEngagementBar,
  InactiveRecipientRow,
  SignupDayPoint,
} from "@/types/announcements-analytics-dashboard";

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastNDaysUtcKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)
    );
    keys.push(utcDateKey(d));
  }
  return keys;
}

type SendRow = {
  id: string;
  title: string;
  sent_at: string;
  recipient_count: number;
};

function aggregateOpensClicks(
  statRows: Array<{
    announcement_id: string;
    user_id: string;
    opened_at: string | null;
    clicked_at: string | null;
  }>
): Map<string, { opens: Set<string>; clicks: Set<string> }> {
  const byAnn = new Map<string, { opens: Set<string>; clicks: Set<string> }>();
  for (const r of statRows) {
    if (!byAnn.has(r.announcement_id)) {
      byAnn.set(r.announcement_id, { opens: new Set(), clicks: new Set() });
    }
    const bag = byAnn.get(r.announcement_id)!;
    if (r.opened_at) bag.opens.add(r.user_id);
    if (r.clicked_at) bag.clicks.add(r.user_id);
  }
  return byAnn;
}

export async function fetchAnnouncementsAnalyticsDashboard(
  svc: SupabaseClient
): Promise<AnnouncementsAnalyticsDashboardData> {
  const dayKeys = lastNDaysUtcKeys(30);
  const counts = new Map<string, number>();
  for (const k of dayKeys) counts.set(k, 0);

  const rangeStartIso = `${dayKeys[0]!}T00:00:00.000Z`;

  const { data: profilesRecent, error: profErr } = await svc
    .from("profiles")
    .select("created_at")
    .gte("created_at", rangeStartIso);

  if (!profErr && profilesRecent) {
    for (const row of profilesRecent as Array<{ created_at: string }>) {
      const key = utcDateKey(new Date(row.created_at));
      if (counts.has(key)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  const signups_daily: SignupDayPoint[] = dayKeys.map((date) => ({
    date,
    count: counts.get(date) ?? 0,
  }));

  const { count: totalUsers } = await svc
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const nowIso = new Date().toISOString();
  const { count: activeTrials } = await svc
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .not("trial_ends_at", "is", null)
    .gt("trial_ends_at", nowIso);

  const { data: sends } = await svc
    .from("product_update_send_log")
    .select("id, title, sent_at, recipient_count")
    .order("sent_at", { ascending: false })
    .limit(40);

  const sendRows = (sends as SendRow[] | null) ?? [];

  let average_open_rate_pct = 0;
  const email_engagement: EmailEngagementBar[] = [];

  const sendIds = sendRows.map((s) => s.id);
  let byAnn = new Map<string, { opens: Set<string>; clicks: Set<string> }>();

  if (sendIds.length > 0) {
    const { data: statRows, error: statErr } = await svc
      .from("announcement_stats")
      .select("announcement_id, user_id, opened_at, clicked_at")
      .in("announcement_id", sendIds);

    if (!statErr && statRows?.length) {
      byAnn = aggregateOpensClicks(
        statRows as Array<{
          announcement_id: string;
          user_id: string;
          opened_at: string | null;
          clicked_at: string | null;
        }>
      );
    }

    const rates: number[] = [];
    for (const s of sendRows) {
      const sent = Math.max(0, s.recipient_count);
      if (sent === 0) continue;
      const opens = byAnn.get(s.id)?.opens.size ?? 0;
      rates.push((opens / sent) * 100);
    }
    if (rates.length > 0) {
      average_open_rate_pct =
        Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10;
    }

    for (const s of sendRows.slice(0, 3)) {
      const sent = Math.max(0, s.recipient_count);
      const bag = byAnn.get(s.id);
      const opened = bag?.opens.size ?? 0;
      const clicked = bag?.clicks.size ?? 0;
      const short =
        s.title.length > 28 ? `${s.title.slice(0, 28)}…` : s.title || "Untitled";
      email_engagement.push({
        id: s.id,
        label: short,
        sent,
        opened,
        clicked,
      });
    }
  }

  let inactive_users: InactiveRecipientRow[] = [];
  try {
    inactive_users = await listInactiveAnnouncementRecipients(svc, 7);
  } catch (e) {
    console.error("[fetchAnnouncementsAnalyticsDashboard] inactive", e);
  }

  return {
    signups_daily,
    email_engagement,
    total_users: totalUsers ?? 0,
    average_open_rate_pct,
    active_trials: activeTrials ?? 0,
    inactive_users,
  };
}
