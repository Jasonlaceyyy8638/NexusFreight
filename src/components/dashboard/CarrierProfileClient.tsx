"use client";

import { useState } from "react";
import { EditCarrierModal } from "@/components/dashboard/EditCarrierModal";
import { LoadStatusBadge } from "@/components/dashboard/LoadStatusBadge";
import { LiveMapLazy } from "@/components/dashboard/LiveMapLazy";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { FmcsaVerifiedBadge } from "@/components/fmcsa/FmcsaVerifiedBadge";
import { normalizeDriverRosterStatus } from "@/lib/driver-roster-status";
import type {
  Carrier,
  Driver,
  EldConnection,
  Load,
  Truck,
} from "@/types/database";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function CarrierProfileClient(props: {
  carrier: Carrier;
  drivers: Driver[];
  loads: Load[];
  trucks: Truck[];
  eldConnections: EldConnection[];
}) {
  const { carrier, drivers, loads, trucks, eldConnections } = props;
  const {
    supabase,
    orgId,
    usingDemo,
    interactiveDemo,
    openDemoAccountGate,
    refresh,
    permissions,
    isCarrierOrg,
  } = useDashboardData();
  const [editOpen, setEditOpen] = useState(false);
  const canFin = permissions.can_view_financials;
  const activeDrivers = drivers.filter(
    (d) => normalizeDriverRosterStatus(d.status) === "active"
  ).length;

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Carrier profile
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {carrier.name}
          </h1>
          {carrier.is_active_authority ? <FmcsaVerifiedBadge /> : null}
          {supabase && orgId ? (
            <button
              type="button"
              onClick={() => {
                if (interactiveDemo) {
                  openDemoAccountGate();
                  return;
                }
                setEditOpen(true);
              }}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-[#007bff]/40 hover:bg-white/10"
            >
              Edit carrier
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-slate-400">
          {[
            carrier.mc_number ? `MC ${carrier.mc_number}` : null,
            carrier.dot_number ? `DOT ${carrier.dot_number}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Service fee
          </p>
          {canFin ? (
            <p className="mt-2 text-2xl font-bold tabular-nums text-white">
              {carrier.service_fee_type === "flat"
                ? money(carrier.service_fee_flat_cents ?? 0)
                : `${carrier.fee_percent}%`}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Hidden — financials off</p>
          )}
          {canFin && carrier.service_fee_type === "flat" ? (
            <p className="mt-1 text-xs text-slate-500">Flat per delivered load</p>
          ) : canFin ? (
            <p className="mt-1 text-xs text-slate-500">Percent of linehaul</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active drivers
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-white">
            {activeDrivers}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {drivers.length} total rostered
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            ELD
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {eldConnections.length > 0
              ? `Connected (${eldConnections.map((e) => e.provider).join(", ")})`
              : "Not connected"}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Live map (this carrier only)
        </h2>
        <LiveMapLazy
          selectedCarrierId={carrier.id}
          trucks={trucks}
          eldConnections={eldConnections}
          carriers={[carrier]}
          height={360}
          isCarrierViewer={isCarrierOrg}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Load history
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#121416] shadow-[0_16px_48px_-16px_rgba(0,0,0,0.5)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-[#16181A] text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Lane</th>
                <th className="px-4 py-3 font-semibold">Rate</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loads.map((load, rowIdx) => (
                <tr
                  key={load.id}
                  className={`border-b border-white/[0.06] last:border-0 ${
                    rowIdx % 2 === 0 ? "bg-[#1A1C1E]" : "bg-[#16181A]/90"
                  }`}
                >
                  <td className="px-4 py-3 text-slate-200">
                    {load.origin} → {load.destination}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-300">
                    {money(load.rate_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <LoadStatusBadge status={load.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {supabase && orgId ? (
        <EditCarrierModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          carrier={carrier}
          supabase={supabase}
          usingDemo={usingDemo}
          interactiveDemo={interactiveDemo}
          openDemoAccountGate={openDemoAccountGate}
          onSaved={() => void refresh()}
          canViewFinancials={canFin}
        />
      ) : null}
    </main>
  );
}
