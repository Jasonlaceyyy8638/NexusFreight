"use client";

import Link from "next/link";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import {
  driverRosterLabel,
  normalizeDriverRosterStatus,
} from "@/lib/driver-roster-status";

export function DashboardInternalTeamPage() {
  const {
    carriers,
    drivers,
    isCarrierOrg,
    interactiveDemo,
    openDemoAccountGate,
  } = useDashboardData();

  if (!isCarrierOrg) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 text-center text-sm text-slate-500">
        This workspace is for carrier fleets. Use{" "}
        <Link href="/dashboard/carriers" className="text-[#3395ff] hover:underline">
          Carriers
        </Link>{" "}
        to manage your portfolio.
      </div>
    );
  }

  const authority = carriers[0];

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Internal team
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Dispatch & operations
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Your in-house dispatchers, safety, and back-office staff roll up under
          one authority. Field drivers are listed below; invite desk staff from
          Settings when you go live.
        </p>
      </header>

      {authority ? (
        <section className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Company authority
          </h2>
          <p className="mt-2 text-lg font-medium text-white">{authority.name}</p>
          <p className="mt-1 text-sm text-slate-500">
            MC {authority.mc_number ?? "—"} · DOT {authority.dot_number ?? "—"}
          </p>
          <Link
            href={`/dashboard/carriers/${authority.id}`}
            className="mt-4 inline-flex text-sm font-semibold text-[#3395ff] hover:text-[#5aadff]"
          >
            Open company profile →
          </Link>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Drivers & field ops
          </h2>
          {interactiveDemo ? (
            <button
              type="button"
              onClick={() => openDemoAccountGate()}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-[#007bff]/40"
            >
              Invite team member
            </button>
          ) : (
            <Link
              href="/dashboard/settings"
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-[#007bff]/40"
            >
              Invite team member
            </Link>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#121416]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-[#16181A] text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No drivers on roster yet.
                  </td>
                </tr>
              ) : (
                drivers.map((d, i) => (
                  <tr
                    key={d.id}
                    className={
                      i % 2 === 0
                        ? "border-b border-white/[0.06] bg-[#1A1C1E]"
                        : "border-b border-white/[0.06] bg-[#16181A]/90"
                    }
                  >
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {d.full_name}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-400">
                      {d.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {driverRosterLabel(normalizeDriverRosterStatus(d.status))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
