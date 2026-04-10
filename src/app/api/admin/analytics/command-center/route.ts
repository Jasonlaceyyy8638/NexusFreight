import { NextResponse } from "next/server";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SignupRow = { bucket: string; n: number };

type SendRow = {
  id: string;
  title: string;
  sent_at: string;
  recipient_count: number;
};

type StatRow = {
  announcement_id: string;
  opened_at: string | null;
  clicked_at: string | null;
};

function isoUtcDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function fillSignupSeries(rows: SignupRow[]): { date: string; signups: number }[] {
  const byDay = new Map<string, number>();
  for (const r of rows) {
    byDay.set(r.bucket, Number(r.n) || 0);
  }
  const out: { date: string; signups: number }[] = [];
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 29);
  start.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, signups: byDay.get(key) ?? 0 });
  }
  return out;
}

function parseRpcBigint(data: unknown): number {
  if (Array.isArray(data)) {
    if (data.length === 1) return parseRpcBigint(data[0]);
    return 0;
  }
  if (typeof data === "number" && !Number.isNaN(data)) return data;
  if (typeof data === "string") {
    const n = parseInt(data, 10);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export async function GET() {
  const admin = await getAdminUserOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 503 }
    );
  }

  const nowIso = new Date().toISOString();
  const iso7 = isoUtcDaysAgo(7);
  const iso14 = isoUtcDaysAgo(14);

  const [
    totalUsersRes,
    signupsLast7Res,
    signupsPrev7Res,
    activeTrialsRes,
    resourceAggRes,
    signupRpcRes,
    sendsRes,
  ] = await Promise.all([
    svc.from("profiles").select("*", { count: "exact", head: true }),
    svc
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", iso7),
    svc
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", iso14)
      .lt("created_at", iso7),
    svc.rpc("admin_active_trials_count"),
    svc
      .from("resources")
      .select("view_count, cta_click_count")
      .not("published_at", "is", null)
      .lte("published_at", nowIso),
    svc.rpc("admin_signups_daily_30d"),
    svc
      .from("product_update_send_log")
      .select("id, title, sent_at, recipient_count")
      .order("sent_at", { ascending: false })
      .limit(3),
  ]);

  if (totalUsersRes.error) {
    return NextResponse.json(
      { error: totalUsersRes.error.message },
      { status: 500 }
    );
  }

  const totalUsers = totalUsersRes.count ?? 0;
  const signupsLast7 = signupsLast7Res.count ?? 0;
  const signupsPrev7 = signupsPrev7Res.count ?? 0;

  if (activeTrialsRes.error) {
    return NextResponse.json(
      { error: activeTrialsRes.error.message },
      { status: 500 }
    );
  }
  const activeTrials = parseRpcBigint(activeTrialsRes.data);

  let resourceViews = 0;
  let resourceCta = 0;
  if (!resourceAggRes.error && resourceAggRes.data) {
    for (const row of resourceAggRes.data as Array<{
      view_count: number | null;
      cta_click_count: number | null;
    }>) {
      resourceViews += row.view_count ?? 0;
      resourceCta += row.cta_click_count ?? 0;
    }
  }

  if (signupRpcRes.error) {
    return NextResponse.json(
      { error: signupRpcRes.error.message },
      { status: 500 }
    );
  }
  const rawRows = (signupRpcRes.data ?? []) as Array<{
    bucket: string;
    n: number | string;
  }>;
  const signupSeries = fillSignupSeries(
    rawRows.map((r) => ({
      bucket: r.bucket,
      n: typeof r.n === "string" ? parseInt(r.n, 10) : r.n,
    }))
  );

  const sends = (sendsRes.data ?? []) as SendRow[];
  const sendIds = sends.map((s) => s.id);

  let stats: StatRow[] = [];
  if (sendIds.length > 0) {
    const { data, error } = await svc
      .from("announcement_stats")
      .select("announcement_id, opened_at, clicked_at")
      .in("announcement_id", sendIds);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    stats = (data ?? []) as StatRow[];
  }

  const statByAnn = new Map<string, StatRow[]>();
  for (const s of stats) {
    const list = statByAnn.get(s.announcement_id) ?? [];
    list.push(s);
    statByAnn.set(s.announcement_id, list);
  }

  const emailFunnel = sends.map((send) => {
    const rows = statByAnn.get(send.id) ?? [];
    const opened = rows.filter((r) => r.opened_at != null).length;
    const clicked = rows.filter((r) => r.clicked_at != null).length;
    const sent = Math.max(0, send.recipient_count);
    return {
      id: send.id,
      title: send.title,
      sent_at: send.sent_at,
      sent,
      opened,
      clicked,
    };
  });

  return NextResponse.json({
    header: {
      totalUsers,
      signupsLast7,
      signupsPrev7,
      activeTrials,
      resourceViews,
      resourceCta,
      resourceEngagement: resourceViews + resourceCta,
    },
    signupSeries,
    emailFunnel,
  });
}
