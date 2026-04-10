import { NextResponse } from "next/server";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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
  user_id: string;
};

/**
 * Recent announcement sends + open/click aggregates and opener list for one send.
 */
export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const selectedId = searchParams.get("id")?.trim() || null;

  const { data: sends, error: sendErr } = await svc
    .from("product_update_send_log")
    .select("id, title, sent_at, recipient_count")
    .order("sent_at", { ascending: false })
    .limit(40);

  if (sendErr) {
    return NextResponse.json({ error: sendErr.message }, { status: 500 });
  }

  if (!sends?.length) {
    return NextResponse.json({
      sends: [],
      selected: null,
      openers: [] as Array<{
        user_id: string;
        opened_at: string;
        auth_email: string | null;
        full_name: string | null;
      }>,
    });
  }

  const sendList = sends as SendRow[];
  const ids = sendList.map((s) => s.id);

  const { data: statRows } = await svc
    .from("announcement_stats")
    .select("announcement_id, opened_at, clicked_at, user_id")
    .in("announcement_id", ids);

  const stats = (statRows ?? []) as StatRow[];
  const byAnnouncement = new Map<string, StatRow[]>();
  for (const row of stats) {
    const list = byAnnouncement.get(row.announcement_id) ?? [];
    list.push(row);
    byAnnouncement.set(row.announcement_id, list);
  }

  const enriched = sendList.map((s) => {
    const rows = byAnnouncement.get(s.id) ?? [];
    const uniqueOpens = rows.filter((r) => r.opened_at != null).length;
    const uniqueClicks = rows.filter((r) => r.clicked_at != null).length;
    const sent = Math.max(0, s.recipient_count);
    const openRatePct = sent > 0 ? Math.round((uniqueOpens / sent) * 1000) / 10 : 0;
    const ctrPct = sent > 0 ? Math.round((uniqueClicks / sent) * 1000) / 10 : 0;
    return {
      id: s.id,
      title: s.title,
      sent_at: s.sent_at,
      total_sent: sent,
      unique_opens: uniqueOpens,
      unique_clicks: uniqueClicks,
      open_rate_pct: openRatePct,
      ctr_pct: ctrPct,
    };
  });

  const resolvedId =
    selectedId && sendList.some((s) => s.id === selectedId)
      ? selectedId
      : sendList[0]!.id;

  const openerStats = (byAnnouncement.get(resolvedId) ?? []).filter(
    (r) => r.opened_at != null
  );

  let openers: Array<{
    user_id: string;
    opened_at: string;
    auth_email: string | null;
    full_name: string | null;
  }> = [];

  if (openerStats.length > 0) {
    const userIds = [...new Set(openerStats.map((r) => r.user_id))];
    const { data: profiles } = await svc
      .from("profiles")
      .select("id, auth_email, full_name")
      .in("id", userIds);

    const profMap = new Map(
      (profiles as Array<{
        id: string;
        auth_email: string | null;
        full_name: string | null;
      }> | null)?.map((p) => [p.id, p]) ?? []
    );

    openers = openerStats
      .map((r) => {
        const p = profMap.get(r.user_id);
        return {
          user_id: r.user_id,
          opened_at: r.opened_at as string,
          auth_email: p?.auth_email ?? null,
          full_name: p?.full_name ?? null,
        };
      })
      .sort((a, b) => a.opened_at.localeCompare(b.opened_at));
  }

  const selectedRow = enriched.find((e) => e.id === resolvedId) ?? enriched[0];

  return NextResponse.json({
    sends: enriched,
    selected: selectedRow ?? null,
    openers,
  });
}
