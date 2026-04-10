"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnnouncementsAnalyticsDashboardData } from "@/types/announcements-analytics-dashboard";

type Props = {
  data: AnnouncementsAnalyticsDashboardData | null;
  loading: boolean;
  onReengagementBlast: () => void;
};

function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${m}/${d}`;
}

export function AnnouncementsAnalyticsDashboard({
  data,
  loading,
  onReengagementBlast,
}: Props) {
  const growthData =
    data?.signups_daily.map((p) => ({
      ...p,
      label: formatDayLabel(p.date),
    })) ?? [];

  const inactive = data?.inactive_users ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Key metrics
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total users
            </p>
            <p className="mt-1 text-2xl font-semibold text-white tabular-nums">
              {loading ? "—" : (data?.total_users ?? 0).toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">Profiles in database</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Avg. open rate
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-300 tabular-nums">
              {loading ? "—" : `${data?.average_open_rate_pct ?? 0}%`}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Across logged announcement sends
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Active trials
            </p>
            <p className="mt-1 text-2xl font-semibold text-sky-300 tabular-nums">
              {loading ? "—" : (data?.active_trials ?? 0).toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Profiles with trial_ends_at in the future
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Growth — new signups (30 days)
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            By profile <code className="text-slate-400">created_at</code> (UTC day).
          </p>
          <div className="mt-4 h-[280px] w-full min-w-0">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Loading…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={growthData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    allowDecimals={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#e2e8f0" }}
                    formatter={(value) => [
                      typeof value === "number" ? value : Number(value),
                      "Signups",
                    ]}
                    labelFormatter={(_, payload) => {
                      const p = payload?.[0]?.payload as { date?: string } | undefined;
                      return p?.date ?? "";
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Signups"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ fill: "#38bdf8", r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Engagement — email performance (last 3 sends)
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Unique opens / clicks vs. total sent per announcement.
          </p>
          <div className="mt-4 h-[280px] w-full min-w-0">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Loading…
              </div>
            ) : !data?.email_engagement.length ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                No announcement sends yet. Sent / opened / clicked appear after bulk
                sends.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.email_engagement}
                  margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
                >
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    angle={-18}
                    textAnchor="end"
                    height={56}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    allowDecimals={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(v) => (
                      <span className="text-slate-300">{String(v)}</span>
                    )}
                  />
                  <Bar dataKey="sent" name="Sent" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="opened"
                    name="Opened"
                    fill="#34d399"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="clicked"
                    name="Clicked"
                    fill="#38bdf8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Inactive users
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">
              Eligible announcement recipients who have{" "}
              <strong className="text-slate-400">not opened</strong> a tracked
              announcement in the last 7 days (includes users who never opened).
            </p>
          </div>
          <button
            type="button"
            disabled={inactive.length === 0}
            onClick={onReengagementBlast}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send re-engagement blast
          </button>
        </div>

        {inactive.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            {loading
              ? "Loading…"
              : "No inactive users right now — everyone opened an email recently, or there are no eligible recipients."}
          </p>
        ) : (
          <div className="mt-4 max-h-56 overflow-y-auto rounded-md border border-slate-800">
            <table className="w-full min-w-[420px] text-left text-xs text-slate-300">
              <thead className="sticky top-0 border-b border-slate-800 bg-slate-950/95 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Last open</th>
                </tr>
              </thead>
              <tbody>
                {inactive.slice(0, 80).map((u) => (
                  <tr
                    key={u.profile_id}
                    className="border-b border-slate-800/80 last:border-0"
                  >
                    <td className="px-3 py-2 font-mono text-slate-400">{u.email}</td>
                    <td className="px-3 py-2">{u.full_name ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {u.last_open_at
                        ? new Date(u.last_open_at).toLocaleString()
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {inactive.length > 80 ? (
              <p className="border-t border-slate-800 px-3 py-2 text-[11px] text-slate-500">
                Showing 80 of {inactive.length}. Blast still targets all{" "}
                {inactive.length} inactive users.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
