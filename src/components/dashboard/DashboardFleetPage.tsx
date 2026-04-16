"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AddDriverModal } from "@/components/dashboard/AddDriverModal";
import { DriverDetailsSheet } from "@/components/dashboard/DriverDetailsSheet";
import { EditDriverModal } from "@/components/dashboard/EditDriverModal";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { CopyableSlateValue } from "@/components/dashboard/CopyableSlateValue";
import {
  DRIVER_ROSTER_STATUSES,
  driverRosterLabel,
  normalizeDriverRosterStatus,
} from "@/lib/driver-roster-status";
import type { Driver, DriverRosterStatus } from "@/types/database";

function truckFleetLabel(
  fleet_status: import("@/types/database").Truck["fleet_status"]
) {
  if (fleet_status === "maintenance") return "Maintenance";
  return "Active";
}

export function DashboardFleetPage() {
  const {
    trucks,
    drivers,
    carriers,
    interactiveDemo,
    openDemoAccountGate,
    isCarrierOrg,
    permissions,
    updateDriverRosterStatus,
    supabase,
    refresh,
  } = useDashboardData();
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [detailsDriver, setDetailsDriver] = useState<Driver | null>(null);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [resendBusy, setResendBusy] = useState(false);

  const carrierFor = (id: string) => carriers.find((c) => c.id === id);
  const carrierName = (id: string) => carrierFor(id)?.name ?? "—";
  const truckUnit = (id: string | null | undefined) =>
    id ? trucks.find((t) => t.id === id)?.unit_number ?? "—" : "—";

  const showAddDriver =
    isCarrierOrg &&
    (interactiveDemo || permissions.can_edit_fleet);

  const canEditDriverRoster =
    interactiveDemo ||
    permissions.can_edit_fleet ||
    (!isCarrierOrg && permissions.can_dispatch_loads);

  const canResendDriverInvite =
    interactiveDemo ||
    (isCarrierOrg &&
      (permissions.admin_access || permissions.can_edit_fleet)) ||
    (!isCarrierOrg &&
      (permissions.admin_access ||
        permissions.can_edit_fleet ||
        permissions.can_dispatch_loads));

  const resendSignupEmail = useCallback(
    async (driverId: string) => {
      if (interactiveDemo) {
        openDemoAccountGate();
        return;
      }
      setResendBusy(true);
      try {
        const res = await fetch("/api/fleet/resend-driver-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driver_id: driverId }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          via?: string;
        };
        if (!res.ok) {
          toast.error(
            typeof j.error === "string" ? j.error : "Could not resend invite."
          );
          return;
        }
        toast.success(
          j.via === "resend_email"
            ? "Signup link sent to the driver’s email."
            : "Invite email sent."
        );
      } catch {
        toast.error("Request failed.");
      } finally {
        setResendBusy(false);
      }
    },
    [interactiveDemo, openDemoAccountGate]
  );

  const showFleetRemoveColumn =
    interactiveDemo && permissions.can_edit_fleet;

  const driverColSpan =
    1 +
    (isCarrierOrg ? 3 : 1) +
    1 +
    1 +
    (showFleetRemoveColumn ? 1 : 0);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Fleet
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Trucks & drivers
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {isCarrierOrg
            ? "Unit availability and maintenance. ELD connections drive live map pings."
            : "Operational roster by carrier. ELD connections drive live map pings."}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Trucks
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#121416]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-[#16181A] text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Unit</th>
                {!isCarrierOrg ? (
                  <th className="px-4 py-3 font-semibold">Carrier</th>
                ) : null}
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">MC number</th>
                <th className="px-4 py-3 font-semibold">DOT number</th>
                <th className="px-4 py-3 font-semibold">Last ping</th>
              </tr>
            </thead>
            <tbody>
              {trucks.length === 0 ? (
                <tr>
                  <td
                    colSpan={isCarrierOrg ? 5 : 6}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No trucks yet.
                  </td>
                </tr>
              ) : (
                trucks.map((t, i) => {
                  const c = carrierFor(t.carrier_id);
                  const maintenance = t.fleet_status === "maintenance";
                  return (
                    <tr
                      key={t.id}
                      className={
                        i % 2 === 0
                          ? "border-b border-white/[0.06] bg-[#1A1C1E]"
                          : "border-b border-white/[0.06] bg-[#16181A]/90"
                      }
                    >
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {t.unit_number}
                      </td>
                      {!isCarrierOrg ? (
                        <td className="px-4 py-3 text-slate-300">
                          {carrierName(t.carrier_id)}
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                            maintenance
                              ? "bg-red-500/15 text-red-300"
                              : "bg-emerald-500/15 text-emerald-300"
                          }`}
                        >
                          {truckFleetLabel(t.fleet_status)}
                        </span>
                      </td>
                      <td className="max-w-[140px] px-4 py-3 text-xs">
                        <CopyableSlateValue
                          value={c?.mc_number}
                          copyLabel="MC number"
                        />
                      </td>
                      <td className="max-w-[140px] px-4 py-3 text-xs">
                        <CopyableSlateValue
                          value={c?.dot_number}
                          copyLabel="DOT number"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {t.last_ping_at
                          ? new Date(t.last_ping_at).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Drivers
          </h2>
          {showAddDriver ? (
            <button
              type="button"
              onClick={() => setAddDriverOpen(true)}
              className="rounded-md bg-[#007bff] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(0,123,255,0.3)] hover:opacity-90"
            >
              Add new driver
            </button>
          ) : isCarrierOrg ? (
            <span className="text-xs text-slate-600">
              Fleet edits require permission
            </span>
          ) : null}
        </div>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#121416]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-[#16181A] text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                {!isCarrierOrg ? (
                  <th className="px-4 py-3 font-semibold">Carrier</th>
                ) : null}
                {isCarrierOrg ? (
                  <>
                    <th className="px-4 py-3 font-semibold">CDL</th>
                    <th className="px-4 py-3 font-semibold">Lic. exp.</th>
                    <th className="px-4 py-3 font-semibold">Truck</th>
                  </>
                ) : null}
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                {showFleetRemoveColumn ? (
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td
                    colSpan={driverColSpan}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No drivers yet.
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
                      <button
                        type="button"
                        onClick={() => setDetailsDriver(d)}
                        className="text-left text-[#3395ff] transition-colors hover:text-[#5aadff] hover:underline"
                      >
                        {d.full_name}
                      </button>
                    </td>
                    {!isCarrierOrg ? (
                      <td className="px-4 py-3 text-slate-400">
                        {carrierName(d.carrier_id)}
                      </td>
                    ) : null}
                    {isCarrierOrg ? (
                      <>
                        <td className="px-4 py-3 text-slate-400">
                          {d.cdl_number ?? d.license_number ?? "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-400">
                          {d.license_expiration
                            ? d.license_expiration.slice(0, 10)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {truckUnit(d.assigned_truck_id)}
                        </td>
                      </>
                    ) : null}
                    <td className="px-4 py-3 tabular-nums text-slate-400">
                      {d.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {canEditDriverRoster ? (
                        <select
                          className="max-w-[9.5rem] rounded-md border border-white/10 bg-[#121416] px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-[#007bff]/50"
                          value={normalizeDriverRosterStatus(d.status)}
                          onChange={(e) =>
                            void updateDriverRosterStatus(
                              d.id,
                              e.target.value as DriverRosterStatus
                            )
                          }
                        >
                          {DRIVER_ROSTER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {driverRosterLabel(s)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            normalizeDriverRosterStatus(d.status) === "active"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : normalizeDriverRosterStatus(d.status) ===
                                  "on_vacation"
                                ? "bg-amber-500/15 text-amber-200"
                                : "bg-slate-600/25 text-slate-400"
                          }`}
                        >
                          {driverRosterLabel(
                            normalizeDriverRosterStatus(d.status)
                          )}
                        </span>
                      )}
                    </td>
                    {showFleetRemoveColumn ? (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDemoAccountGate()}
                          className="text-xs font-semibold text-red-400/90 transition-colors hover:text-red-300"
                        >
                          Remove
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAddDriver ? (
        <AddDriverModal
          open={addDriverOpen}
          onClose={() => setAddDriverOpen(false)}
        />
      ) : null}

      {detailsDriver ? (
        <DriverDetailsSheet
          driver={detailsDriver}
          onClose={() => setDetailsDriver(null)}
          isCarrierOrg={isCarrierOrg}
          carrierName={carrierName(detailsDriver.carrier_id)}
          truckUnitLabel={truckUnit(detailsDriver.assigned_truck_id)}
          onEdit={
            canEditDriverRoster
              ? () => {
                  setEditDriver(detailsDriver);
                  setDetailsDriver(null);
                }
              : undefined
          }
          canResendInvite={
            canResendDriverInvite &&
            Boolean(detailsDriver.auth_user_id?.trim())
          }
          onResendInvite={() => void resendSignupEmail(detailsDriver.id)}
          resendBusy={resendBusy}
        />
      ) : null}

      {editDriver && canEditDriverRoster ? (
        <EditDriverModal
          open
          onClose={() => setEditDriver(null)}
          driver={editDriver}
          trucks={trucks}
          supabase={supabase}
          interactiveDemo={interactiveDemo}
          openDemoAccountGate={openDemoAccountGate}
          onSaved={() => void refresh()}
          canViewFinancials={permissions.can_view_financials}
        />
      ) : null}
    </div>
  );
}
