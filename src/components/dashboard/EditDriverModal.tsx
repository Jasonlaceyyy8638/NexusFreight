"use client";

import { useCallback, useEffect, useState } from "react";
import { CarrierSelect } from "@/components/dashboard/CarrierSelect";
import { DriverRosterStatusPicker } from "@/components/dashboard/DriverRosterStatusPicker";
import { normalizeDriverRosterStatus } from "@/lib/driver-roster-status";
import type {
  Driver,
  DriverPayStructure,
  DriverRosterStatus,
  Truck,
} from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Props = {
  open: boolean;
  onClose: () => void;
  driver: Driver;
  trucks: Truck[];
  supabase: SupabaseClient | null;
  interactiveDemo: boolean;
  openDemoAccountGate: () => void;
  onSaved: () => void;
  canViewFinancials: boolean;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";

export function EditDriverModal({
  open,
  onClose,
  driver,
  trucks,
  supabase,
  interactiveDemo,
  openDemoAccountGate,
  onSaved,
  canViewFinancials,
}: Props) {
  const fleetTrucks = trucks.filter((t) => t.carrier_id === driver.carrier_id);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCarrier, setPhoneCarrier] = useState("");
  const [cdl, setCdl] = useState("");
  const [licenseExpiration, setLicenseExpiration] = useState("");
  const [truckId, setTruckId] = useState<string>("");
  const [rosterStatus, setRosterStatus] = useState<DriverRosterStatus>("active");
  const [payStructure, setPayStructure] =
    useState<DriverPayStructure>("percent_gross");
  const [payPercent, setPayPercent] = useState("30");
  const [payCpmUsd, setPayCpmUsd] = useState("0.70");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFullName(driver.full_name);
    setPhone(driver.phone ?? "");
    setCdl(driver.cdl_number ?? driver.license_number ?? "");
    setLicenseExpiration(driver.license_expiration?.slice(0, 10) ?? "");
    setTruckId(driver.assigned_truck_id ?? "");
    setRosterStatus(normalizeDriverRosterStatus(driver.status));
    setPayStructure(driver.pay_structure ?? "percent_gross");
    setPayPercent(String(driver.pay_percent_of_gross ?? 30));
    setPayCpmUsd(
      ((driver.pay_cpm_cents ?? 70) / 100).toFixed(2)
    );
    setError(null);
  }, [driver]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    if (!supabase) {
      setError("Connect Supabase to save changes.");
      return;
    }
    if (!fullName.trim()) {
      setError("Name is required.");
      return;
    }

    const pct = parseFloat(payPercent);
    const cpmCents = Math.round(parseFloat(payCpmUsd || "0") * 100);
    if (canViewFinancials) {
      if (payStructure === "percent_gross") {
        if (Number.isNaN(pct) || pct < 0 || pct > 100) {
          setError("Pay % of gross must be 0–100.");
          return;
        }
      } else if (cpmCents < 0 || Number.isNaN(cpmCents)) {
        setError("Enter a valid CPM ($/mile).");
        return;
      }
    }

    setBusy(true);
    try {
      const row: Record<string, unknown> = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        phone_carrier: phoneCarrier.trim() || null,
        cdl_number: cdl.trim() || null,
        license_expiration: licenseExpiration.trim() || null,
        assigned_truck_id: truckId || null,
        status: rosterStatus,
        updated_at: new Date().toISOString(),
      };
      if (canViewFinancials) {
        row.pay_structure = payStructure;
        row.pay_percent_of_gross = payStructure === "percent_gross" ? pct : 30;
        row.pay_cpm_cents = payStructure === "cpm" ? cpmCents : 70;
      }
      const { error: upErr } = await supabase
        .from("drivers")
        .update(row)
        .eq("id", driver.id);
      if (upErr) throw upErr;
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save driver");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#16181A] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.75)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-driver-title"
      >
        <div className="border-b border-white/10 px-6 py-4">
          <h2 id="edit-driver-title" className="text-lg font-semibold text-white">
            Edit driver
          </h2>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 py-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Full name
            <input
              className={inputClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Phone
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Wireless carrier (email-to-SMS)
            <CarrierSelect
              className={inputClass}
              value={phoneCarrier}
              onChange={setPhoneCarrier}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            CDL number
            <input className={inputClass} value={cdl} onChange={(e) => setCdl(e.target.value)} />
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Roster status
            </p>
            <div className="mt-2">
              <DriverRosterStatusPicker value={rosterStatus} onChange={setRosterStatus} />
            </div>
          </div>

          {canViewFinancials ? (
            <div className="rounded-lg border border-white/[0.08] bg-[#121416]/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Pay structure
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="radio"
                    name="payStructure"
                    checked={payStructure === "percent_gross"}
                    onChange={() => setPayStructure("percent_gross")}
                  />
                  % of load gross
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="radio"
                    name="payStructure"
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
                  Cents per loaded mile (e.g. 0.70 = $0.70/mi)
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

          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(0,123,255,0.3)] hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
