"use client";

import { useEffect } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import type { Driver } from "@/types/database";
import {
  driverRosterLabel,
  normalizeDriverRosterStatus,
} from "@/lib/driver-roster-status";

type Props = {
  driver: Driver;
  onClose: () => void;
  isCarrierOrg: boolean;
  carrierName: string;
  truckUnitLabel: string;
  onEdit?: () => void;
};

export function DriverDetailsSheet({
  driver,
  onClose,
  isCarrierOrg,
  carrierName,
  truckUnitLabel,
  onEdit,
}: Props) {
  const { permissions } = useDashboardData();
  const canFin = permissions.can_view_financials;
  const roster = normalizeDriverRosterStatus(driver.status);
  const cdl = driver.cdl_number ?? driver.license_number ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        className="fixed inset-x-0 bottom-0 top-10 z-[110] bg-black/55 backdrop-blur-[2px]"
        aria-label="Close driver details"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-10 z-[120] flex h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col border-l border-white/10 bg-[#16181A] shadow-[-12px_0_48px_-12px_rgba(0,0,0,0.65)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-details-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Driver details
            </p>
            <h2
              id="driver-details-title"
              className="mt-1 truncate text-lg font-semibold text-white"
            >
              {driver.full_name}
            </h2>
            {!isCarrierOrg ? (
              <p className="mt-0.5 text-xs text-slate-500">{carrierName}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-md bg-[#007bff] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(0,123,255,0.25)] hover:opacity-90"
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 text-sm">
          <dl className="space-y-5">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Status
              </dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    roster === "active"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : roster === "on_vacation"
                        ? "bg-amber-500/15 text-amber-200"
                        : "bg-slate-600/25 text-slate-400"
                  }`}
                >
                  {driverRosterLabel(roster)}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Contact
              </dt>
              <dd className="mt-1 space-y-1 text-slate-200">
                <p className="tabular-nums text-slate-300">
                  {driver.phone ?? "—"}
                </p>
                {driver.contact_email ? (
                  <p className="break-all text-slate-400">{driver.contact_email}</p>
                ) : null}
              </dd>
            </div>

            {isCarrierOrg && canFin ? (
              <div className="rounded-lg border border-white/[0.08] bg-[#121416]/90 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Pay profile
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {driver.pay_structure === "cpm"
                    ? `CPM: $${((driver.pay_cpm_cents ?? 70) / 100).toFixed(2)}/mi loaded`
                    : `% of load gross: ${driver.pay_percent_of_gross ?? 30}%`}
                </p>
              </div>
            ) : null}

            {isCarrierOrg ? (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  License &amp; assignment
                </dt>
                <dd className="mt-1 space-y-2 text-slate-300">
                  <p>
                    <span className="text-slate-500">CDL / license: </span>
                    {cdl ?? "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Expires: </span>
                    {driver.license_expiration
                      ? driver.license_expiration.slice(0, 10)
                      : "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Truck: </span>
                    {truckUnitLabel}
                  </p>
                </dd>
              </div>
            ) : null}

            <div className="rounded-lg border border-white/[0.08] bg-[#121416]/90 p-4">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Emergency contact
              </dt>
              <dd className="mt-3 space-y-2 text-slate-200">
                <p>
                  <span className="text-slate-500">Name: </span>
                  {driver.emergency_contact_name?.trim() || "—"}
                </p>
                <p className="tabular-nums">
                  <span className="text-slate-500">Phone: </span>
                  {driver.emergency_contact_phone?.trim() || "—"}
                </p>
                <p>
                  <span className="text-slate-500">Relationship: </span>
                  {driver.emergency_contact_relationship?.trim() || "—"}
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </>
  );
}
