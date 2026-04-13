"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { createClient } from "@/lib/supabase/client";
import {
  computeDeadheadPayCents,
  computeDriverTotalPayCents,
  computeLoadedDriverPayCents,
} from "@/lib/calculations";
import {
  CARRIER_AUTHORITY_INACTIVE_TOOLTIP,
  CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING,
  carrierAuthorityAssignable,
} from "@/lib/carrier-authority";
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

type ParsedRateConStop = {
  locationName?: string;
  address?: string;
  date?: string | null;
  timeWindow?: string;
};

type ParsedRateCon = {
  pickup?: ParsedRateConStop;
  delivery?: ParsedRateConStop;
  commodities?: string;
  weightLbs?: number | null;
  specialInstructions?: string;
  totalRateUsd?: number | null;
};

function joinStopLine(
  locationName: string,
  address: string,
  date: string,
  timeWindow: string
): string {
  const loc = [locationName.trim(), address.trim()].filter(Boolean).join(" · ");
  const sched = [date.trim(), timeWindow.trim()].filter(Boolean).join(" · ");
  if (loc && sched) return `${loc} | ${sched}`;
  return loc || sched || "";
}

function applyParsedToForm(p: ParsedRateCon): {
  pickupLocationName: string;
  pickupAddress: string;
  pickupDate: string;
  pickupTimeWindow: string;
  deliveryLocationName: string;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTimeWindow: string;
  commodities: string;
  weightLbs: string;
  specialInstructions: string;
  origin: string;
  destination: string;
  ocrRateCents: number | null;
} {
  const pu = p.pickup ?? {};
  const del = p.delivery ?? {};
  const pickupLocationName = (pu.locationName ?? "").trim();
  const pickupAddress = (pu.address ?? "").trim();
  const pickupDate = (pu.date ?? "").trim().slice(0, 10);
  const pickupTimeWindow = (pu.timeWindow ?? "").trim();
  const deliveryLocationName = (del.locationName ?? "").trim();
  const deliveryAddress = (del.address ?? "").trim();
  const deliveryDate = (del.date ?? "").trim().slice(0, 10);
  const deliveryTimeWindow = (del.timeWindow ?? "").trim();
  const commodities = (p.commodities ?? "").trim();
  const weightLbs =
    p.weightLbs != null && Number.isFinite(Number(p.weightLbs))
      ? String(p.weightLbs)
      : "";
  const specialInstructions = (p.specialInstructions ?? "").trim();
  const origin = joinStopLine(
    pickupLocationName,
    pickupAddress,
    pickupDate,
    pickupTimeWindow
  );
  const destination = joinStopLine(
    deliveryLocationName,
    deliveryAddress,
    deliveryDate,
    deliveryTimeWindow
  );
  let ocrRateCents: number | null = null;
  if (p.totalRateUsd != null && Number.isFinite(Number(p.totalRateUsd))) {
    ocrRateCents = Math.round(Number(p.totalRateUsd) * 100);
  }
  return {
    pickupLocationName,
    pickupAddress,
    pickupDate,
    pickupTimeWindow,
    deliveryLocationName,
    deliveryAddress,
    deliveryDate,
    deliveryTimeWindow,
    commodities,
    weightLbs,
    specialInstructions,
    origin,
    destination,
    ocrRateCents,
  };
}

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
    profileRole,
    dispatcherCommissionPercent,
  } = useDashboardData();
  const canFin = permissions.can_view_financials;
  const assignableCarriers = useMemo(
    () => carriers.filter(carrierAuthorityAssignable),
    [carriers]
  );
  const inactiveCarriers = useMemo(
    () => carriers.filter((c) => !carrierAuthorityAssignable(c)),
    [carriers]
  );
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

  const [pickupLocationName, setPickupLocationName] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTimeWindow, setPickupTimeWindow] = useState("");
  const [deliveryLocationName, setDeliveryLocationName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState("");
  const [commodities, setCommodities] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const [ocrRateCents, setOcrRateCents] = useState<number | null>(null);
  const [manualRateOverride, setManualRateOverride] = useState(false);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(true);

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

  useEffect(() => {
    if (!open) return;
    if (!assignableCarriers.some((c) => c.id === carrierId)) {
      const next = assignableCarriers[0]?.id ?? "";
      setCarrierId(next);
      setDriverId("");
    }
  }, [open, assignableCarriers, carrierId]);

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
    setPickupLocationName("");
    setPickupAddress("");
    setPickupDate("");
    setPickupTimeWindow("");
    setDeliveryLocationName("");
    setDeliveryAddress("");
    setDeliveryDate("");
    setDeliveryTimeWindow("");
    setCommodities("");
    setWeightLbs("");
    setSpecialInstructions("");
    setOcrRateCents(null);
    setManualRateOverride(false);
    setScanProcessing(false);
    setScanError(null);
    setDetailsOpen(true);
  }, [carriers]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const effectiveRateCents = useMemo(() => {
    if (ocrRateCents != null && !manualRateOverride) return ocrRateCents;
    return Math.round(parseFloat(rate || "0") * 100);
  }, [ocrRateCents, manualRateOverride, rate]);

  const payStructure: DriverPayStructure =
    selectedDriver?.pay_structure === "cpm" ? "cpm" : "percent_gross";
  const payPct = selectedDriver?.pay_percent_of_gross ?? 30;
  const payCpm = selectedDriver?.pay_cpm_cents ?? 70;

  const previewPay = useMemo(() => {
    const rateCents = effectiveRateCents;
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
    effectiveRateCents,
    loadedMiles,
    deadheadMiles,
    payDeadhead,
    deadheadRateUsd,
    payStructure,
    payPct,
    payCpm,
    canFin,
  ]);

  const runScan = async (f: File) => {
    setScanError(null);
    setScanProcessing(true);
    try {
      if (interactiveDemo) {
        await new Promise((r) => setTimeout(r, 900));
        const mock: ParsedRateCon = {
          pickup: {
            locationName: "Shipper Warehouse A",
            address: "100 Industrial Pkwy, Dallas, TX",
            date: "2026-04-15",
            timeWindow: "08:00–14:00",
          },
          delivery: {
            locationName: "Receiver DC",
            address: "2500 Logistics Blvd, Atlanta, GA",
            date: "2026-04-17",
            timeWindow: "06:00–12:00 FCFS",
          },
          commodities: "Dry grocery, floor-loaded",
          weightLbs: 42000,
          specialInstructions: "Seal intact; check in at guard shack.",
          totalRateUsd: 2850,
        };
        const applied = applyParsedToForm(mock);
        setPickupLocationName(applied.pickupLocationName);
        setPickupAddress(applied.pickupAddress);
        setPickupDate(applied.pickupDate);
        setPickupTimeWindow(applied.pickupTimeWindow);
        setDeliveryLocationName(applied.deliveryLocationName);
        setDeliveryAddress(applied.deliveryAddress);
        setDeliveryDate(applied.deliveryDate);
        setDeliveryTimeWindow(applied.deliveryTimeWindow);
        setCommodities(applied.commodities);
        setWeightLbs(applied.weightLbs);
        setSpecialInstructions(applied.specialInstructions);
        setOrigin(applied.origin);
        setDestination(applied.destination);
        setOcrRateCents(applied.ocrRateCents);
        setManualRateOverride(false);
        setRate("");
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        setScanError("Configure Supabase client to scan documents.");
        return;
      }
      const ext = f.name.split(".").pop() || "pdf";
      const path = `${orgId}/scan-temp/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("ratecons")
        .upload(path, f, { upsert: false });
      if (upErr) throw upErr;

      const { data, error: fnErr } = await supabase.functions.invoke<{
        parsed?: ParsedRateCon;
        error?: string;
      }>("ratecon-parse", {
        body: { storagePath: path },
      });
      if (fnErr) throw fnErr;
      if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(String(data.error));
      }
      const parsed = data?.parsed;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Unexpected response from scan service.");
      }
      const applied = applyParsedToForm(parsed);
      setPickupLocationName(applied.pickupLocationName);
      setPickupAddress(applied.pickupAddress);
      setPickupDate(applied.pickupDate);
      setPickupTimeWindow(applied.pickupTimeWindow);
      setDeliveryLocationName(applied.deliveryLocationName);
      setDeliveryAddress(applied.deliveryAddress);
      setDeliveryDate(applied.deliveryDate);
      setDeliveryTimeWindow(applied.deliveryTimeWindow);
      setCommodities(applied.commodities);
      setWeightLbs(applied.weightLbs);
      setSpecialInstructions(applied.specialInstructions);
      setOrigin(applied.origin);
      setDestination(applied.destination);
      setOcrRateCents(applied.ocrRateCents);
      setManualRateOverride(false);
      setRate("");
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : "Scan failed. Try another file."
      );
    } finally {
      setScanProcessing(false);
    }
  };

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
    const rateCents = effectiveRateCents;
    const originLine = origin.trim();
    const destLine = destination.trim();
    if (!originLine || !destLine || !carrierId) {
      setError("Origin, destination, and carrier are required.");
      setBusy(false);
      return;
    }

    const carrierRow = carriers.find((c) => c.id === carrierId);
    if (carrierRow && !carrierAuthorityAssignable(carrierRow)) {
      setError(CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING);
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

      const dispatcherPersonalProfitCents =
        profileRole === "Dispatcher" && rateCents > 0
          ? Math.round((rateCents * dispatcherCommissionPercent) / 100)
          : null;

      const nowIso = new Date().toISOString();
      const row: Record<string, unknown> = {
        org_id: orgId,
        carrier_id: carrierId,
        driver_id: driverId || null,
        origin: originLine,
        destination: destLine,
        rate_cents: rateCents,
        status: driverId ? "dispatched" : "draft",
        ratecon_storage_path: rateconPath,
        pickup_location_name: pickupLocationName.trim() || null,
        pickup_address: pickupAddress.trim() || null,
        pickup_date: pickupDate.trim() || null,
        pickup_time_window: pickupTimeWindow.trim() || null,
        delivery_location_name: deliveryLocationName.trim() || null,
        delivery_address: deliveryAddress.trim() || null,
        delivery_date: deliveryDate.trim() || null,
        delivery_time_window: deliveryTimeWindow.trim() || null,
        commodities: commodities.trim() || null,
        weight_lbs:
          weightLbs.trim() && !Number.isNaN(parseFloat(weightLbs))
            ? parseFloat(weightLbs)
            : null,
        special_instructions: specialInstructions.trim() || null,
      };
      if (dispatcherPersonalProfitCents != null) {
        row.dispatcher_personal_profit_cents = dispatcherPersonalProfitCents;
      }
      if (driverId) {
        row.dispatched_at = nowIso;
      }

      if (canFin) {
        row.pay_deadhead = payDeadhead;
        row.deadhead_rate_cpm_cents = dhRateCpm;
        row.deadhead_miles = payDeadhead ? dhM : null;
        row.loaded_miles = ldM;
        row.deadhead_pay_cents = dhPay;
        row.loaded_driver_pay_cents = loadedPay;
        row.driver_total_pay_cents = driverTotal;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("loads")
        .insert(row)
        .select("id")
        .single();
      if (insErr) throw insErr;

      if (inserted?.id && driverId) {
        try {
          await fetch("/api/dispatch/notify-driver", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ loadId: inserted.id }),
          });
        } catch {
          /* notification best-effort */
        }
      }

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

  const selectedCarrier = carriers.find((c) => c.id === carrierId);
  const carrierAssignable =
    Boolean(carrierId) &&
    selectedCarrier != null &&
    carrierAuthorityAssignable(selectedCarrier);

  const hideLinehaulInForm = ocrRateCents != null && !manualRateOverride;

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
            Scan a rate confirmation to pre-fill stops and driver details. Linehaul
            from the document is stored for payroll and carrier totals but is not
            shown in this form when captured by AI.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-[#007bff]/20 bg-[#007bff]/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              RateCon scanner
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Upload a PDF or image. We store it in{" "}
              <code className="rounded border border-white/10 bg-[#121416] px-1 text-slate-400">
                ratecons
              </code>{" "}
              temporarily, parse with Gemini in an Edge Function, then you can
              review everything below.
            </p>
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#007bff]/35 bg-[#121416]/40 px-4 py-6 text-center text-sm text-slate-400 transition-colors hover:border-[#007bff]/55">
              <input
                type="file"
                className="hidden"
                accept=".pdf,application/pdf,.png,.jpg,.jpeg,.webp"
                disabled={scanProcessing}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  setScanError(null);
                  if (f) void runScan(f);
                }}
              />
              {scanProcessing ? (
                <span className="font-medium text-[#007bff]">Processing…</span>
              ) : (
                <>
                  <span className="text-slate-300">Drop or click — Scan RateCon</span>
                  <span className="mt-1 text-xs text-slate-500">
                    Parses pickup, delivery, cargo, and linehaul (linehaul hidden
                    here when found)
                  </span>
                </>
              )}
            </label>
            {scanError ? (
              <p className="mt-2 text-xs text-red-400" role="alert">
                {scanError}
              </p>
            ) : null}
            {ocrRateCents != null && !manualRateOverride ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-[11px] text-emerald-400/90">
                  Linehaul captured from the document — not shown as an editable
                  field here (driver-facing views stay free of broker price).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setManualRateOverride(true);
                    setRate((ocrRateCents / 100).toFixed(2));
                  }}
                  className="rounded border border-white/15 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5"
                >
                  Edit linehaul manually
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-md border border-white/10 bg-[#121416]/50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            <span>Pickup &amp; delivery details</span>
            <span className="text-slate-400">{detailsOpen ? "−" : "+"}</span>
          </button>
          {detailsOpen ? (
            <div className="grid gap-3 rounded-lg border border-white/[0.06] bg-[#121416]/40 p-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  Pick-up
                </p>
                <input
                  className={inputClass}
                  value={pickupLocationName}
                  onChange={(e) => setPickupLocationName(e.target.value)}
                  placeholder="Location name"
                />
                <input
                  className={inputClass}
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Street address"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className={inputClass}
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    value={pickupTimeWindow}
                    onChange={(e) => setPickupTimeWindow(e.target.value)}
                    placeholder="Time window"
                  />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  Delivery
                </p>
                <input
                  className={inputClass}
                  value={deliveryLocationName}
                  onChange={(e) => setDeliveryLocationName(e.target.value)}
                  placeholder="Location name"
                />
                <input
                  className={inputClass}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Street address"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className={inputClass}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    value={deliveryTimeWindow}
                    onChange={(e) => setDeliveryTimeWindow(e.target.value)}
                    placeholder="Time window"
                  />
                </div>
              </div>
              <label className="block sm:col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Commodities
                <input
                  className={inputClass}
                  value={commodities}
                  onChange={(e) => setCommodities(e.target.value)}
                  placeholder="e.g. dry van grocery"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Weight (lbs)
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={inputClass}
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="block sm:col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Special instructions (driver)
                <textarea
                  className={`${inputClass} min-h-[72px] resize-y`}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Temp, seals, check-in, lumpers…"
                />
              </label>
            </div>
          ) : null}

          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Origin (summary)
            <input
              className={inputClass}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="City, ST or full address"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Destination (summary)
            <input
              className={inputClass}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="City, ST or full address"
            />
          </label>
          {!hideLinehaulInForm ? (
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
          ) : (
            <div className="rounded-md border border-white/10 bg-[#121416]/60 px-3 py-2 text-sm text-slate-500">
              Linehaul is set from the scanned rate confirmation (not editable here).
            </div>
          )}
          {singleCarrier ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Fleet / authority
              </p>
              <p
                className={`mt-1.5 rounded-md border px-3 py-2 text-sm ${
                  carriers[0] && !carrierAuthorityAssignable(carriers[0])
                    ? "border-red-500/40 bg-red-950/25 text-slate-500"
                    : "border-white/10 bg-[#121416] text-slate-200"
                }`}
                title={
                  carriers[0] && !carrierAuthorityAssignable(carriers[0])
                    ? CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING
                    : undefined
                }
              >
                {carriers[0]?.name ?? "—"}
              </p>
              {carriers[0] && !carrierAuthorityAssignable(carriers[0]) ? (
                <p className="mt-2 text-xs font-medium text-red-400">
                  {CARRIER_AUTHORITY_INACTIVE_TOOLTIP}
                </p>
              ) : null}
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
                {assignableCarriers.length > 0 ? (
                  <optgroup label="Active — assignable">
                    {assignableCarriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {inactiveCarriers.length > 0 ? (
                  <optgroup label="Authority inactive">
                    {inactiveCarriers.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        disabled
                        title={CARRIER_AUTHORITY_INACTIVE_TOOLTIP}
                      >
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              {assignableCarriers.length === 0 ? (
                <p className="mt-2 text-xs font-medium text-red-400">
                  No carriers with active authority. Add or re-verify a carrier
                  first.
                </p>
              ) : inactiveCarriers.length > 0 ? (
                <p className="mt-2 text-xs text-red-400/90">
                  {CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING} Inactive
                  carriers cannot be selected.
                </p>
              ) : null}
            </label>
          )}
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Driver
            <select
              className={inputClass}
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              disabled={!carrierAssignable}
              title={
                !carrierAssignable
                  ? CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING
                  : undefined
              }
            >
              <option value="">Unassigned</option>
              {filteredDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </label>
          {driverId ? (
            <p className="text-[11px] leading-snug text-slate-500">
              This load is marked dispatched so your driver sees it in the
              mobile app right away. They receive SMS or email when a channel is
              on file. Use Loads to adjust status later.
            </p>
          ) : null}

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
              Rate confirmation file (optional)
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              If you already scanned above, the same file is saved with the load.
              Choose a different file here to replace it.
            </p>
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-amber-500/25 bg-amber-950/10 px-4 py-6 text-center text-sm text-slate-400 transition-colors hover:border-amber-500/40">
              <input
                type="file"
                className="hidden"
                accept=".pdf,application/pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  setScanError(null);
                }}
              />
              {file ? (
                <span className="font-medium text-slate-200">{file.name}</span>
              ) : (
                <>
                  <span className="text-slate-300">
                    Attach rate confirmation PDF
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    Stored in{" "}
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
              disabled={busy || !carrierAssignable || scanProcessing}
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
