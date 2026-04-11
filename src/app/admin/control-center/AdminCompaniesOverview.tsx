"use client";

import type { AdminCompanyOverviewRow } from "@/app/api/admin/companies-overview/route";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function AdminCompaniesOverview() {
  const [rows, setRows] = useState<AdminCompanyOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/companies-overview", {
        credentials: "include",
      });
      if (res.status === 404) {
        setErr("Unauthorized.");
        setRows([]);
        return;
      }
      const data = (await res.json()) as {
        companies?: AdminCompanyOverviewRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data.companies ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (err) {
    return <p className="mt-6 text-sm text-red-400">{err}</p>;
  }

  return (
    <>
      <ul className="mt-10 space-y-3 md:hidden" aria-label="Companies overview">
        {rows.length === 0 ? (
          <li className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center text-sm text-slate-500">
            No carriers yet.
          </li>
        ) : (
          rows.map((r) => (
            <li
              key={r.company_id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm"
            >
              <p className="font-semibold text-white">{r.carrier_name}</p>
              <dl className="mt-3 space-y-2 text-xs text-slate-400">
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">
                    Workspace
                  </dt>
                  <dd>{r.agency_or_fleet_name}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </dt>
                  <dd>{r.org_type}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">
                    Primary admin
                  </dt>
                  <dd className="break-all font-mono">{r.primary_admin_email ?? "—"}</dd>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums text-slate-300">
                  <span>Staff: {r.membership_staff}</span>
                  <span>Drivers (memberships): {r.membership_drivers}</span>
                  <span>Roster: {r.drivers_roster_count}</span>
                </div>
              </dl>
            </li>
          ))
        )}
      </ul>

      <div className="mt-10 hidden rounded-xl border border-slate-800 bg-slate-900/50 md:block">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No carriers yet.
          </p>
        ) : (
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Company (carrier)</th>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Primary admin</th>
                  <th className="px-4 py-3">Staff (memberships)</th>
                  <th className="px-4 py-3">Drivers (memberships)</th>
                  <th className="px-4 py-3">Roster drivers</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.company_id}
                    className="border-b border-slate-800/80 last:border-0 hover:bg-slate-900/80"
                  >
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {r.carrier_name}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {r.agency_or_fleet_name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.org_type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {r.primary_admin_email ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-300">
                      {r.membership_staff}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-300">
                      {r.membership_drivers}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-300">
                      {r.drivers_roster_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
