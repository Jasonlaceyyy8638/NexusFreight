"use client";

import type {
  AdminDispatcherOrgRow,
  AdminFleetOrgRow,
  AdminOrgMetrics,
} from "@/app/api/admin/org-insights/route";
import type { AdminFleetLoadRow } from "@/app/api/admin/org-insights/fleet-loads/route";
import type { AdminShieldCarrierRow } from "@/app/api/admin/org-insights/shield/route";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type OrgSubTab = "dispatchers" | "fleets";

function fmtPct(last: number, prev: number): string {
  if (prev <= 0) return last > 0 ? "New" : "—";
  const p = ((last - prev) / prev) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(0)}%`;
}

export function AdminOrgInsights() {
  const [subTab, setSubTab] = useState<OrgSubTab>("dispatchers");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AdminOrgMetrics | null>(null);
  const [dispatchers, setDispatchers] = useState<AdminDispatcherOrgRow[]>([]);
  const [fleets, setFleets] = useState<AdminFleetOrgRow[]>([]);

  const [shieldOrg, setShieldOrg] = useState<AdminDispatcherOrgRow | null>(
    null
  );
  const [shieldRows, setShieldRows] = useState<AdminShieldCarrierRow[] | null>(
    null
  );
  const [shieldLoading, setShieldLoading] = useState(false);

  const [fleetOrg, setFleetOrg] = useState<AdminFleetOrgRow | null>(null);
  const [fleetLoads, setFleetLoads] = useState<AdminFleetLoadRow[] | null>(null);
  const [fleetLoading, setFleetLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/org-insights", { credentials: "include" });
      if (res.status === 404) {
        setErr("Unauthorized.");
        return;
      }
      const data = (await res.json()) as {
        metrics?: AdminOrgMetrics;
        dispatchers?: AdminDispatcherOrgRow[];
        fleets?: AdminFleetOrgRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setMetrics(data.metrics ?? null);
      setDispatchers(data.dispatchers ?? []);
      setFleets(data.fleets ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openShield(row: AdminDispatcherOrgRow) {
    setShieldOrg(row);
    setShieldRows(null);
    setShieldLoading(true);
    try {
      const res = await fetch(
        `/api/admin/org-insights/shield?orgId=${encodeURIComponent(row.org_id)}`,
        { credentials: "include" }
      );
      const data = (await res.json()) as {
        carriers?: AdminShieldCarrierRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Failed");
      setShieldRows(data.carriers ?? []);
    } catch {
      setShieldRows([]);
    } finally {
      setShieldLoading(false);
    }
  }

  async function openFleetLoads(row: AdminFleetOrgRow) {
    setFleetOrg(row);
    setFleetLoads(null);
    setFleetLoading(true);
    try {
      const res = await fetch(
        `/api/admin/org-insights/fleet-loads?orgId=${encodeURIComponent(row.org_id)}`,
        { credentials: "include" }
      );
      const data = (await res.json()) as {
        loads?: AdminFleetLoadRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Failed");
      setFleetLoads(data.loads ?? []);
    } catch {
      setFleetLoads([]);
    } finally {
      setFleetLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (err) {
    return <p className="text-sm text-red-400">{err}</p>;
  }

  const faster = metrics?.faster_growing;
  const fasterLabel =
    faster === "independent_carriers"
      ? "Independent contract carriers (agency vetting list growth)"
      : faster === "fleet_drivers"
        ? "Fleet drivers (carrier org roster growth)"
        : faster === "tie"
          ? "Both segments are even (last 30d vs prior 30d)"
          : "Insufficient net adds in both windows to call a leader";

  return (
    <div className="space-y-8">
      {metrics && (
        <section aria-label="Cross-platform growth">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
            Marketing signal
          </p>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Compare net additions over the last 30 days vs the previous 30 days.
            Totals are across all Agency (independent dispatch) and Carrier (fleet)
            workspaces.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Total active independent carriers
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
                {metrics.total_independent_carriers}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Last 30d: {metrics.carriers_added_last_30d} · Prev 30d:{" "}
                {metrics.carriers_added_prev_30d} ·{" "}
                <span className="text-slate-300">
                  {fmtPct(
                    metrics.carriers_added_last_30d,
                    metrics.carriers_added_prev_30d
                  )}
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Total fleet drivers
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
                {metrics.total_fleet_drivers}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Last 30d: {metrics.drivers_added_last_30d} · Prev 30d:{" "}
                {metrics.drivers_added_prev_30d} ·{" "}
                <span className="text-slate-300">
                  {fmtPct(
                    metrics.drivers_added_last_30d,
                    metrics.drivers_added_prev_30d
                  )}
                </span>
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-lg border border-sky-500/20 bg-sky-950/30 px-4 py-3 text-sm text-sky-100/90">
            <span className="font-semibold text-sky-300">Growing faster: </span>
            {fasterLabel}
          </p>
        </section>
      )}

      <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => setSubTab("dispatchers")}
          className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition ${
            subTab === "dispatchers"
              ? "bg-slate-100 text-slate-900"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          Independent Dispatchers
        </button>
        <button
          type="button"
          onClick={() => setSubTab("fleets")}
          className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition ${
            subTab === "fleets"
              ? "bg-slate-100 text-slate-900"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          Fleet Carriers
        </button>
      </div>

      {subTab === "dispatchers" ? (
        <>
          <ul className="mt-6 space-y-3 md:hidden" aria-label="Dispatcher organizations">
            {dispatchers.length === 0 ? (
              <li className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center text-sm text-slate-500">
                No agency organizations yet.
              </li>
            ) : (
              dispatchers.map((row) => (
                <li
                  key={row.org_id}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm"
                >
                  <p className="font-semibold text-white">
                    {row.primary_name?.trim() || "—"}
                  </p>
                  <p className="mt-1 text-slate-400">{row.agency_company_name}</p>
                  <p className="mt-2 break-all text-xs text-slate-500">
                    {row.primary_email || "—"}
                  </p>
                  <p className="mt-2 tabular-nums text-slate-300">
                    Contract carriers: {row.contract_carrier_count}
                  </p>
                  <button
                    type="button"
                    onClick={() => void openShield(row)}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-slate-600 bg-slate-800 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    View logs
                  </button>
                </li>
              ))
            )}
          </ul>
          <section className="mt-6 hidden rounded-xl border border-slate-800 bg-slate-900/50 md:block">
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Dispatcher</th>
                    <th className="px-4 py-3">Agency</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Contract carriers</th>
                    <th className="px-4 py-3 w-44">Carrier Shield</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No agency organizations yet.
                      </td>
                    </tr>
                  ) : (
                    dispatchers.map((row) => (
                      <tr
                        key={row.org_id}
                        className="border-b border-slate-800/80 last:border-0 hover:bg-slate-900/80"
                      >
                        <td className="px-4 py-3 font-medium text-slate-200">
                          {row.primary_name?.trim() || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {row.agency_company_name}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {row.primary_email || "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-300">
                          {row.contract_carrier_count}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void openShield(row)}
                            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                          >
                            View logs
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          <ul className="mt-6 space-y-3 md:hidden" aria-label="Fleet organizations">
            {fleets.length === 0 ? (
              <li className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center text-sm text-slate-500">
                No carrier (fleet) organizations yet.
              </li>
            ) : (
              fleets.map((row) => (
                <li
                  key={row.org_id}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm"
                >
                  <p className="font-semibold text-white">{row.company_name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    MC {row.mc_number || "—"}
                  </p>
                  <p className="mt-2 tabular-nums text-slate-300">
                    Internal drivers: {row.internal_driver_count}
                  </p>
                  <button
                    type="button"
                    onClick={() => void openFleetLoads(row)}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-slate-600 bg-slate-800 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    View loads
                  </button>
                </li>
              ))
            )}
          </ul>
          <section className="mt-6 hidden rounded-xl border border-slate-800 bg-slate-900/50 md:block">
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">MC number</th>
                    <th className="px-4 py-3">Internal drivers</th>
                    <th className="px-4 py-3 w-44">Load history</th>
                  </tr>
                </thead>
                <tbody>
                  {fleets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No carrier (fleet) organizations yet.
                      </td>
                    </tr>
                  ) : (
                    fleets.map((row) => (
                      <tr
                        key={row.org_id}
                        className="border-b border-slate-800/80 last:border-0 hover:bg-slate-900/80"
                      >
                        <td className="px-4 py-3 font-medium text-slate-200">
                          {row.company_name}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {row.mc_number || "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-300">
                          {row.internal_driver_count}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void openFleetLoads(row)}
                            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                          >
                            View loads
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {shieldOrg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShieldOrg(null);
              setShieldRows(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Carrier Shield — {shieldOrg.agency_company_name}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  FMCSA compliance status and nightly audit notes per vetted carrier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShieldOrg(null);
                  setShieldRows(null);
                }}
                className="shrink-0 rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            {shieldLoading ? (
              <div className="mt-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                      <th className="px-3 py-2">Carrier</th>
                      <th className="px-3 py-2">MC</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Shield log</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(shieldRows ?? []).map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-slate-800/80 align-top last:border-0"
                      >
                        <td className="px-3 py-2 font-medium text-slate-200">
                          {c.name}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">
                          {c.mc_number || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-400">
                          {c.compliance_status || "—"}
                        </td>
                        <td className="max-w-md px-3 py-2 whitespace-pre-wrap text-slate-500">
                          {c.compliance_log?.trim() ||
                            c.compliance_alert?.trim() ||
                            "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {fleetOrg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setFleetOrg(null);
              setFleetLoads(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Driver load history — {fleetOrg.company_name}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Recent loads (newest first, up to 100).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFleetOrg(null);
                  setFleetLoads(null);
                }}
                className="shrink-0 rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            {fleetLoading ? (
              <div className="mt-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                      <th className="px-3 py-2">Origin</th>
                      <th className="px-3 py-2">Destination</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Rate</th>
                      <th className="px-3 py-2">Dispatched</th>
                      <th className="px-3 py-2">Delivered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fleetLoads ?? []).map((L) => (
                      <tr
                        key={L.id}
                        className="border-b border-slate-800/80 last:border-0"
                      >
                        <td className="px-3 py-2 text-slate-300">{L.origin}</td>
                        <td className="px-3 py-2 text-slate-300">
                          {L.destination}
                        </td>
                        <td className="px-3 py-2 text-slate-400">{L.status}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-500">
                          ${(L.rate_cents / 100).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {L.dispatched_at
                            ? new Date(L.dispatched_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {L.delivered_at
                            ? new Date(L.delivered_at).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(fleetLoads ?? []).length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No loads recorded for this fleet yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
