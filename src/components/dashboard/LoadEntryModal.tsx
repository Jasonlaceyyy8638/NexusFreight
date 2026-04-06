"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { createClient } from "@/lib/supabase/client";
import {
  computeDeadheadPayCents,
  computeDriverTotalPayCents,
  computeLoadedDriverPayCents,
} from "@/lib/calculations";
import { normalizeDriverRosterStatus } from "@/lib/driver-roster-status";
import type { Carrier, Driver, DriverPayStructure } from "@/types/database";

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  carriers: Carrier[];
  drivers: Driver[];
  onCreated: () => void;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";

export function LoadEntryModal({
  open,
  onClose,
  orgId,
  carriers,
  drivers,
  onCreated,
}: Props) {
  const {
    interactiveDemo,
    openDemoAccountGate,
    trucks,
    permissions,
  } = useDashboardData();
  const canFin = permissions.can_view_financials;
  const singleCarrier = carriers.length <= 1;
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [rate, setRate] = useState("");
  const [carrierId, setCarrierId] = useState(carriers[0]?.id ?? "");
  const [driverId, setDriverId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [payDeadhead, setPayDeadhead] = useState(false);
  const [deadheadRateUsd, setDeadheadRateUsd] = useState("0.50");
  const [deadheadMiles, setDeadheadMiles] = useState<number | null>(null);
  const [loadedMiles, setLoadedMiles] = useState<number | null>(null);
  const [mileageMsg, setMileageMsg] = useState<string | null>(null);
  const [mileageBusy, setMileageBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredDrivers = drivers.filter(
    (d) =>
      d.carrier_id === carrierId &&
      normalizeDriverRosterStatus(d.status) === "active"
  );

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === driverId),
    [drivers, driverId]
  );

  const driverTruck = useMemo(() => {
    if (!selectedDriver?.assigned_truck_id) return undefined;
    return trucks.find((t) => t.id === selectedDriver.assigned_truck_id);
  }, [trucks, selectedDriver]);

  useEffect(() => {
    if (!open || !singleCarrier) return;
    const id = carriers[0]?.id ?? "";
    if (id && carrierId !== id) {
      setCarrierId(id);
      setDriverId("");
    }
  }, [open, singleCarrier, carriers, carrierId]);

  const reset = useCallback(() => {
    setOrigin("");
    setDestination("");
    setRate("");
    setCarrierId(carriers[0]?.id ?? "");
    setDriverId("");
    setFile(null);
    setPayDeadhead(false);
    setDeadheadRateUsd("0.50");
    setDeadheadMiles(null);
    setLoadedMiles(null);
    setMileageMsg(null);
    setError(null);
  }, [carriers]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const payStructure: DriverPayStructure =
    selectedDriver?.pay_structure === "cpm" ? "cpm" : "percent_gross";
  const payPct = selectedDriver?.pay_percent_of_gross ?? 30;
  const payCpm = selectedDriver?.pay_cpm_cents ?? 70;

  const previewPay = useMemo(() => {
    const rateCents = Math.round(parseFloat(rate || "0") * 100);
    const ld = loadedMiles ?? 0;
    const dh = deadheadMiles ?? 0;
    const dhRateCpm = Math.round(parseFloat(deadheadRateUsd || "0") * 100);
    const loadedPay = computeLoadedDriverPayCents({
      payStructure,
      rateCents,
      loadedMiles: ld,
      payPercentOfGross: payPct,
      payCpmCents: payCpm,
    });
    const dhPay = computeDeadheadPayCents({
      payDeadhead: payDeadhead && canFin,
      deadheadMiles: dh,
      deadheadRateCpmCents: dhRateCpm,
    });
    const total = computeDriverTotalPayCents(loadedPay, dhPay);
    return { loadedPay, dhPay, total };
  }, [
    rate,
    loadedMiles,
    deadheadMiles,
    payDeadhead,
    deadheadRateUsd,
    payStructure,
    payPct,
    payCpm,
    canFin,
  ]);

  const fetchMileage = async () => {
    if (!canFin) return;
    setMileageBusy(true);
    setMileageMsg(null);
    try {
      const res = await fetch("/api/routing/mileage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: origin.trim(),
          destination: destination.trim(),
          fromLng: driverTruck?.last_lng ?? null,
          fromLat: driverTruck?.last_lat ?? null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMileageMsg(typeof j.error === "string" ? j.error : "Mileage request failed.");
        return;
      }
      setDeadheadMiles(typeof j.deadheadMiles === "number" ? j.deadheadMiles : 0);
      setLoadedMiles(typeof j.loadedMiles === "number" ? j.loadedMiles : 0);
      setMileageMsg(
        driverTruck?.last_lat != null && driverTruck?.last_lng != null
          ? "Miles from assigned truck position to pickup, then pickup to delivery."
          : "Loaded miles from pickup to delivery. Deadhead is 0 without truck GPS — assign a truck with map pings for deadhead."
      );
    } finally {
      setMileageBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    setBusy(true);
    setError(null);
    const rateCents = Math.round(parseFloat(rate || "0") * 100);
    if (!origin.trim() || !destination.trim() || !carrierId) {
      setError("Origin, destination, and carrier are required.");
      setBusy(false);
      return;
    }

    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL and ANON_KEY to save loads.");
        setBusy(false);
        return;
      }
      let rateconPath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "pdf";
        const path = `${orgId}/${carrierId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("ratecons")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        rateconPath = path;
      }

      const dhRateCpm =
        canFin && payDeadhead
          ? Math.round(parseFloat(deadheadRateUsd || "0") * 100)
          : null;
      const ldM = loadedMiles ?? 0;
      const dhM =
        canFin && payDeadhead ? (deadheadMiles ?? 0) : 0;
      const loadedPay = computeLoadedDriverPayCents({
        payStructure,
        rateCents,
        loadedMiles: ldM,
        payPercentOfGross: payPct,
        payCpmCents: payCpm,
      });
      const dhPay = computeDeadheadPayCents({
        payDeadhead: Boolean(canFin && payDeadhead),
        deadheadMiles: dhM,
        deadheadRateCpmCents: dhRateCpm ?? 0,
      });
      const driverTotal = computeDriverTotalPayCents(loadedPay, dhPay);

      const row: Record<string, unknown> = {
        org_id: orgId,
        carrier_id: carrierId,
        driver_id: driverId || null,
        origin: origin.trim(),
        destination: destination.trim(),
        rate_cents: rateCents,
        status: "draft",
        ratecon_storage_path: rateconPath,
      };

      if (canFin) {
        row.pay_deadhead = payDeadhead;
        row.deadhead_rate_cpm_cents = dhRateCpm;
        row.deadhead_miles = payDeadhead ? dhM : null;
        row.loaded_miles = ldM;
        row.deadhead_pay_cents = dhPay;
        row.loaded_driver_pay_cents = loadedPay;
        row.driver_total_pay_cents = driverTotal;
      }

      const { error: insErr } = await supabase.from("loads").insert(row);
      if (insErr) throw insErr;

      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save load");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#16181A] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.75)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="load-modal-title"
      >
        <div className="border-b border-white/10 px-6 py-4">
          <h2
            id="load-modal-title"
            className="text-lg font-semibold text-white"
          >
            New load
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Lane, rate, assignments, optional rate con PDF, and payroll fields when
            you have financials access.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Origin
            <input
              className={inputClass}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="City, ST or full address"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Destination
            <input
              className={inputClass}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="City, ST or full address"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Rate (USD)
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0.00"
            />
          </label>
          {singleCarrier ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Fleet / authority
              </p>
              <p className="mt-1.5 rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-200">
                {carriers[0]?.name ?? "—"}
              </p>
            </div>
          ) : (
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Carrier
              <select
                className={inputClass}
                value={carrierId}
                onChange={(e) => {
                  setCarrierId(e.target.value);
                  setDriverId("");
                }}
              >
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Driver
            <select
              className={inputClass}
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {filteredDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </label>

          {canFin ? (
            <div className="rounded-lg border border-white/[0.08] bg-[#121416]/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Driver pay &amp; deadhead
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                Pay uses the driver&apos;s profile (% of gross or CPM). Fetch miles
                via Mapbox (server token) from the assigned truck&apos;s last GPS
                to pickup, then pickup to delivery.
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={payDeadhead}
                  onChange={(e) => setPayDeadhead(e.target.checked)}
                />
                Pay deadhead?
              </label>
              {payDeadhead ? (
                <label className="mt-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Deadhead rate ($/mile)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputClass}
                    value={deadheadRateUsd}
                    onChange={(e) => setDeadheadRateUsd(e.target.value)}
                  />
                </label>
              ) : null}
              <button
                type="button"
                disabled={
                  mileageBusy || !origin.trim() || !destination.trim()
                }
                onClick={() => void fetchMileage()}
                className="mt-3 rounded-md bg-[#007bff] px-3 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(0,123,255,0.3)] hover:opacity-90 disabled:opacity-40"
              >
                {mileageBusy ? "Fetching…" : "Fetch mileage"}
              </button>
              {deadheadMiles != null && loadedMiles != null ? (
                <p className="mt-2 text-xs text-slate-400">
                  Deadhead: {deadheadMiles.toFixed(1)} mi · Loaded:{" "}
                  {loadedMiles.toFixed(1)} mi
                </p>
              ) : null}
              {mileageMsg ? (
                <p className="mt-2 text-[11px] text-slate-500">{mileageMsg}</p>
              ) : null}
              <div className="mt-3 border-t border-white/10 pt-3 text-xs text-slate-400">
                <p>
                  Loaded / gross pay:{" "}
                  <span className="font-semibold text-slate-200">
                    ${(previewPay.loadedPay / 100).toFixed(2)}
                  </span>
                </p>
                <p>
                  Deadhead pay:{" "}
                  <span className="font-semibold text-slate-200">
                    ${(previewPay.dhPay / 100).toFixed(2)}
                  </span>
                </p>
                <p>
                  Total driver pay:{" "}
                  <span className="font-semibold text-emerald-300">
                    ${(previewPay.total / 100).toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rate confirmation (PDF preferred)
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Upload the carrier-signed rate confirmation. It appears under Loads →
              Documents for view, download, and email.
            </p>
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-amber-500/25 bg-amber-950/10 px-4 py-8 text-center text-sm text-slate-400 transition-colors hover:border-amber-500/40">
              <input
                type="file"
                className="hidden"
                accept=".pdf,application/pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <span className="font-medium text-slate-200">{file.name}</span>
              ) : (
                <>
                  <span className="text-slate-300">
                    Upload rate confirmation PDF
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    PDF recommended · stored in{" "}
                    <code className="rounded-md border border-white/10 bg-[#16181A] px-1 text-slate-400">
                      ratecons
                    </code>
                  </span>
                </>
              )}
            </label>
          </div>
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
              {busy ? "Saving…" : "Save load"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
