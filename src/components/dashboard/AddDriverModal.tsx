"use client";

import { useCallback, useEffect, useState } from "react";
import { DriverRosterStatusPicker } from "@/components/dashboard/DriverRosterStatusPicker";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import type {
  DriverPayStructure,
  DriverRosterStatus,
  Truck,
} from "@/types/database";

type Props = {
  open: boolean;
  onClose: () => void;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";

export function AddDriverModal({ open, onClose }: Props) {
  const {
    orgId,
    supabase,
    carriers,
    trucks,
    selectedCarrierId,
    interactiveDemo,
    addDemoDriver,
    refresh,
    isCarrierOrg,
    permissions,
  } = useDashboardData();
  const canFin = permissions.can_view_financials;

  const carrierId = selectedCarrierId ?? carriers[0]?.id ?? "";
  const fleetTrucks = trucks.filter((t) => t.carrier_id === carrierId);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cdl, setCdl] = useState("");
  const [licenseExpiration, setLicenseExpiration] = useState("");
  const [truckId, setTruckId] = useState<string>("");
  const [rosterStatus, setRosterStatus] = useState<DriverRosterStatus>("active");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [payStructure, setPayStructure] =
    useState<DriverPayStructure>("percent_gross");
  const [payPercent, setPayPercent] = useState("30");
  const [payCpmUsd, setPayCpmUsd] = useState("0.70");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFullName("");
    setPhone("");
    setCdl("");
    setLicenseExpiration("");
    setTruckId("");
    setRosterStatus("active");
    setEmergencyName("");
    setEmergencyPhone("");
    setEmergencyRelationship("");
    setPayStructure("percent_gross");
    setPayPercent("30");
    setPayCpmUsd("0.70");
    setError(null);
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCarrierOrg) return;
    if (!fullName.trim()) {
      setError("Name is required.");
      return;
    }
    if (interactiveDemo) {
      addDemoDriver({
        full_name: fullName.trim(),
        phone: phone.trim(),
        cdl_number: cdl.trim(),
        license_expiration: licenseExpiration.trim() || null,
        assigned_truck_id: truckId || null,
        status: rosterStatus,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
        emergency_contact_relationship: emergencyRelationship.trim() || null,
        pay_structure: canFin ? payStructure : undefined,
        pay_percent_of_gross: canFin
          ? parseFloat(payPercent) || 30
          : undefined,
        pay_cpm_cents: canFin
          ? Math.round(parseFloat(payCpmUsd || "0") * 100)
          : undefined,
      });
      reset();
      onClose();
      return;
    }
    if (!supabase || !orgId || !carrierId) {
      setError("Connect Supabase and ensure your fleet is loaded.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const pct = parseFloat(payPercent);
      const cpmCents = Math.round(parseFloat(payCpmUsd || "0") * 100);
      const row: Record<string, unknown> = {
        org_id: orgId,
        carrier_id: carrierId,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        cdl_number: cdl.trim() || null,
        license_expiration: licenseExpiration.trim() || null,
        assigned_truck_id: truckId || null,
        status: rosterStatus,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
        emergency_contact_relationship: emergencyRelationship.trim() || null,
      };
      if (canFin) {
        row.pay_structure = payStructure;
        row.pay_percent_of_gross =
          payStructure === "percent_gross" && !Number.isNaN(pct) ? pct : 30;
        row.pay_cpm_cents =
          payStructure === "cpm" && !Number.isNaN(cpmCents) ? cpmCents : 70;
      }
      const { error: insErr } = await supabase.from("drivers").insert(row);
      if (insErr) throw insErr;
      await refresh();
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add driver");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#16181A] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.75)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-driver-title"
      >
        <div className="border-b border-white/10 px-6 py-4">
          <h2
            id="add-driver-title"
            className="text-lg font-semibold text-white"
          >
            Add driver
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            New drivers appear in the load entry modal for dispatch on your MC.
          </p>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 py-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Full name
            <input
              className={inputClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jordan Ellis"
              required
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Phone
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+15551234567"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            CDL number
            <input
              className={inputClass}
              value={cdl}
              onChange={(e) => setCdl(e.target.value)}
              placeholder="State + number"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            License expiration
            <input
              type="date"
              className={inputClass}
              value={licenseExpiration}
              onChange={(e) => setLicenseExpiration(e.target.value)}
            />
          </label>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Active drivers appear in load assignment. On vacation or terminated
              are hidden from dispatch until set back to active.
            </p>
            <div className="mt-2">
              <DriverRosterStatusPicker
                value={rosterStatus}
                onChange={setRosterStatus}
              />
            </div>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Assigned truck
            <select
              className={inputClass}
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
            >
              <option value="">— None —</option>
              {fleetTrucks.map((t: Truck) => (
                <option key={t.id} value={t.id}>
                  {t.unit_number}
                </option>
              ))}
            </select>
          </label>
          {canFin ? (
            <div className="rounded-lg border border-white/[0.08] bg-[#121416]/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Pay structure
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="radio"
                    name="addPayStructure"
                    checked={payStructure === "percent_gross"}
                    onChange={() => setPayStructure("percent_gross")}
                  />
                  % of load gross
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="radio"
                    name="addPayStructure"
                    checked={payStructure === "cpm"}
                    onChange={() => setPayStructure("cpm")}
                  />
                  CPM ($/mile)
                </label>
              </div>
              {payStructure === "percent_gross" ? (
                <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Percent of load gross
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className={inputClass}
                    value={payPercent}
                    onChange={(e) => setPayPercent(e.target.value)}
                  />
                </label>
              ) : (
                <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  $/mile (loaded)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClass}
                    value={payCpmUsd}
                    onChange={(e) => setPayCpmUsd(e.target.value)}
                  />
                </label>
              )}
            </div>
          ) : null}
          <div className="rounded-lg border border-white/[0.08] bg-[#121416]/60 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Emergency contact
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Required for carrier safety and HR records.
            </p>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Name
              <input
                className={inputClass}
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Contact full name"
                required
              />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Phone
              <input
                className={inputClass}
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="+15551234567"
                required
              />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Relationship to driver
              <input
                className={inputClass}
                value={emergencyRelationship}
                onChange={(e) => setEmergencyRelationship(e.target.value)}
                placeholder="Spouse, parent, sibling…"
                required
              />
            </label>
          </div>
          {!interactiveDemo && !supabase ? (
            <p className="text-xs text-amber-200/80">
              Add{" "}
              <code className="rounded border border-white/10 px-1 text-slate-400">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              and{" "}
              <code className="rounded border border-white/10 px-1 text-slate-400">
                ANON_KEY
              </code>{" "}
              to save drivers to your org.
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(0,123,255,0.3)] hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save driver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
