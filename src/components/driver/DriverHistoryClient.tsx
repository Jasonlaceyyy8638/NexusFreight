"use client";

import { useDriverPortal } from "@/components/driver/DriverPortalProvider";
import { LOAD_STATUS_LABELS } from "@/lib/load-status-labels";
import type { LoadStatus } from "@/types/database";

export function DriverHistoryClient() {
  const { loading, driverId, historyLoads } = useDriverPortal();

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-slate-500">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  if (!driverId) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-bold text-white">History</h1>
        </header>
        <p className="text-sm text-slate-400">
          Link your driver account to see trip history.
        </p>
      </div>
    );
  }

  if (historyLoads.length === 0) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-bold text-white">History</h1>
          <p className="mt-1 text-sm text-slate-400">
            Past deliveries and cancellations
          </p>
        </header>
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-12 text-center">
          <p className="text-slate-400">No completed loads yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-white">History</h1>
        <p className="mt-1 text-sm text-slate-400">
          Past deliveries and cancellations
        </p>
      </header>
      <ul className="space-y-3">
        {historyLoads.map((load) => (
          <li
            key={load.id}
            className="rounded-xl border border-white/10 bg-[#16181A]/90 px-4 py-3"
          >
            <p className="font-semibold text-white">{load.origin}</p>
            <p className="text-sm text-slate-400">→ {load.destination}</p>
            <p className="mt-2 text-xs text-slate-500">
              {LOAD_STATUS_LABELS[load.status as LoadStatus] ?? load.status}
              {load.delivered_at
                ? ` · ${new Date(load.delivered_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}`
                : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
