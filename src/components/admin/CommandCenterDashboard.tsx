"use client";

import type {
  CommandCenterEmailFunnelRow,
  CommandCenterPayload,
  CommandCenterSignupPoint,
} from "@/types/command-center";
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
import {
  BarChart3,
  Eye,
  Loader2,
  Mail,
  Minus,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const chartAxis = { stroke: "#64748b", fontSize: 11 };
const gridStroke = "#1e293b";
const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
  color: "#e2e8f0",
};

function TrendIcon({ up, flat }: { up: boolean; flat?: boolean }) {
  if (flat) {
    return <Minus className="h-4 w-4 text-slate-500" aria-hidden />;
  }
  if (up) {
    return <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden />;
  }
  return <TrendingDown className="h-4 w-4 text-rose-400" aria-hidden />;
}

function StatCard({
  label,
  value,
  sub,
  trendUp,
  trendFlat,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  trendUp: boolean;
  trendFlat?: boolean;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950/95 p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white tabular-nums">
            {value}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{sub}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 p-2">
          <Icon className="h-5 w-5 text-sky-500/90" aria-hidden />
          <TrendIcon up={trendUp} flat={trendFlat} />
        </div>
      </div>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${m}/${d}`;
}

function funnelChartRows(rows: CommandCenterEmailFunnelRow[]) {
  return rows.map((r) => ({
    name:
      r.title.length > 22 ? `${r.title.slice(0, 22)}…` : r.title || "Send",
    Sent: r.sent,
    Opened: r.opened,
    Clicked: r.clicked,
  }));
}

export function CommandCenterDashboard() {
  const [data, setData] = useState<CommandCenterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/analytics/command-center", {
        credentials: "include",
      });
      const j = (await res.json()) as CommandCenterPayload & { error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to load analytics.");
      setData(j);
    } catch (e) {
      setData(null);
      setErr(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const header = data?.header;
  const signupSeries: CommandCenterSignupPoint[] = data?.signupSeries ?? [];
  const emailFunnel = data?.emailFunnel ?? [];

  const userTrendUp =
    (header?.signupsLast7 ?? 0) >= (header?.signupsPrev7 ?? 0);
  const userTrendFlat =
    (header?.signupsLast7 ?? 0) === 0 && (header?.signupsPrev7 ?? 0) === 0;

  const trialTrendUp = (header?.activeTrials ?? 0) > 0;
  const trialTrendFlat = (header?.activeTrials ?? 0) === 0;

  const resourceTrendUp = (header?.resourceEngagement ?? 0) > 0;
  const resourceTrendFlat = (header?.resourceEngagement ?? 0) === 0;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
        Internal
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <BarChart3 className="h-8 w-8 text-sky-400" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Nexus Command Center
        </h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        Growth and engagement load fresh on each visit—signup velocity, trials,
        resource traffic, and announcement funnels.
      </p>
      <p className="mt-3 flex flex-wrap gap-4 text-sm">
        <Link
          href="/admin/control-center"
          className="font-medium text-sky-400 hover:underline"
        >
          ← Nexus Control
        </Link>
        <Link
          href="/admin/announcements"
          className="font-medium text-sky-400 hover:underline"
        >
          Product announcements →
        </Link>
      </p>

      {loading ? (
        <div className="mt-16 flex items-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading analytics…
        </div>
      ) : err ? (
        <p className="mt-10 text-sm text-red-400" role="alert">
          {err}
        </p>
      ) : header ? (
        <>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total users"
              value={header.totalUsers.toLocaleString()}
              sub={`${header.signupsLast7} signups last 7d · prior week ${header.signupsPrev7}`}
              trendUp={userTrendUp}
              trendFlat={userTrendFlat}
              icon={Users}
            />
            <StatCard
              label="Active trials"
              value={header.activeTrials.toLocaleString()}
              sub="Profiles in trial window without active Stripe sub"
              trendUp={trialTrendUp}
              trendFlat={trialTrendFlat}
              icon={Mail}
            />
            <StatCard
              label="Resource traffic"
              value={header.resourceEngagement.toLocaleString()}
              sub={`${header.resourceViews} views · ${header.resourceCta} beta CTA taps (published guides)`}
              trendUp={resourceTrendUp}
              trendFlat={resourceTrendFlat}
              icon={Eye}
            />
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Signup growth (30 days)
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                New profiles per day (UTC midnight buckets).
              </p>
              <div className="mt-4 h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={signupSeries}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      minTickGap={24}
                      tick={chartAxis}
                      stroke="#334155"
                    />
                    <YAxis
                      allowDecimals={false}
                      width={36}
                      tick={chartAxis}
                      stroke="#334155"
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(v) => String(v)}
                      formatter={(value) => [
                        typeof value === "number"
                          ? value.toLocaleString()
                          : String(value ?? "—"),
                        "Signups",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="signups"
                      name="Signups"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={{ r: 2, fill: "#38bdf8" }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Email funnel (last 3 sends)
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Sent (log) → unique opens → unique clicks per announcement.
              </p>
              {emailFunnel.length === 0 ? (
                <p className="mt-8 text-sm text-slate-500">
                  No announcement sends logged yet.
                </p>
              ) : (
                <div className="mt-4 h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={funnelChartRows(emailFunnel)}
                      margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis
                        dataKey="name"
                        tick={chartAxis}
                        stroke="#334155"
                        interval={0}
                        angle={-18}
                        textAnchor="end"
                        height={56}
                      />
                      <YAxis
                        allowDecimals={false}
                        width={40}
                        tick={chartAxis}
                        stroke="#334155"
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend
                        wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                      />
                      <Bar
                        dataKey="Sent"
                        fill="#334155"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Opened"
                        fill="#0ea5e9"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Clicked"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
