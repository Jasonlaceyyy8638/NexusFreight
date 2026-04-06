"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import type { Driver, Load } from "@/types/database";

function rowPayload(
  load: Load,
  driver: Driver,
  fleetName: string
) {
  return {
    fleetName,
    driverName: driver.full_name,
    driverEmail: driver.contact_email ?? null,
    loadId: load.id,
    origin: load.origin,
    destination: load.destination,
    rateCents: load.rate_cents,
    payStructure: driver.pay_structure === "cpm" ? "cpm" : "percent_gross",
    payPercentOfGross: driver.pay_percent_of_gross ?? 30,
    payCpmCents: driver.pay_cpm_cents ?? 70,
    loadedMiles: load.loaded_miles ?? 0,
    deadheadMiles: load.deadhead_miles ?? 0,
    payDeadhead: Boolean(load.pay_deadhead),
    deadheadRateCpmCents: load.deadhead_rate_cpm_cents ?? null,
    deadheadPayCents: load.deadhead_pay_cents ?? 0,
    loadedDriverPayCents: load.loaded_driver_pay_cents ?? 0,
    driverTotalPayCents: load.driver_total_pay_cents ?? 0,
  };
}

const btnPrimary =
  "rounded-md bg-[#007bff] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(0,123,255,0.3)] hover:opacity-90 disabled:opacity-40";

export function DashboardDriverSettlementsPage() {
  const router = useRouter();
  const {
    isCarrierOrg,
    loads,
    drivers,
    carriers,
    permissions,
    interactiveDemo,
    openDemoAccountGate,
  } = useDashboardData();
  const fin = permissions.can_view_financials;
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isCarrierOrg) router.replace("/dashboard/team");
  }, [isCarrierOrg, router]);

  const fleetName = carriers[0]?.name?.trim() || "Fleet";

  const rows = useMemo(() => {
    const out: { load: Load; driver: Driver }[] = [];
    for (const load of loads) {
      if (load.status !== "delivered" || !load.driver_id) continue;
      const driver = drivers.find((d) => d.id === load.driver_id);
      if (!driver) continue;
      out.push({ load, driver });
    }
    return out.sort((a, b) => {
      const ta = a.load.delivered_at
        ? new Date(a.load.delivered_at).getTime()
        : 0;
      const tb = b.load.delivered_at
        ? new Date(b.load.delivered_at).getTime()
        : 0;
      return tb - ta;
    });
  }, [loads, drivers]);

  const downloadPdf = async (load: Load, driver: Driver) => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    const key = `dl-${load.id}`;
    setBusyKey(key);
    setMsg(null);
    try {
      const res = await fetch("/api/settlements/driver-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rowPayload(load, driver, fleetName)),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg(typeof j.error === "string" ? j.error : "PDF failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `driver-settlement-${load.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusyKey(null);
    }
  };

  const emailPdf = async (load: Load, driver: Driver, to: string) => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    const key = `em-${load.id}`;
    setBusyKey(key);
    setMsg(null);
    try {
      const res = await fetch("/api/settlements/email-driver-settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rowPayload(load, driver, fleetName), to }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Email failed");
        return;
      }
      setMsg(`Emailed settlement for load ${load.id.slice(0, 8)}…`);
    } finally {
      setBusyKey(null);
    }
  };

  if (!isCarrierOrg) {
    return (
      <div className="px-6 py-16 text-center text-sm text-slate-500">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Payroll
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Driver settlements
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Delivered loads with an assigned driver. PDF includes lane, miles,
          rates, deadhead, and total payout.
        </p>
      </header>

      {!fin ? (
        <div className="rounded-xl border border-white/10 bg-[#16181A]/50 p-6">
          <p className="text-sm text-slate-500">
            Driver settlement tools require &ldquo;Can view financials.&rdquo;
          </p>
        </div>
      ) : null}

      {msg ? (
        <p className="text-sm text-slate-400" role="status">
          {msg}
        </p>
      ) : null}

      <div
        className={`overflow-hidden rounded-xl border border-white/10 bg-[#121416] ${!fin ? "pointer-events-none opacity-40" : ""}`}
      >
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-[#16181A] text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Driver</th>
              <th className="px-4 py-3 font-semibold">Load ID</th>
              <th className="px-4 py-3 font-semibold">Lane</th>
              <th className="px-4 py-3 font-semibold text-right">Gross pay</th>
              <th className="px-4 py-3 font-semibold text-right">Deadhead</th>
              <th className="px-4 py-3 font-semibold text-right">Total</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No delivered loads with drivers yet.
                </td>
              </tr>
            ) : (
              rows.map(({ load, driver }, i) => {
                const gross = load.loaded_driver_pay_cents ?? 0;
                const dh = load.deadhead_pay_cents ?? 0;
                const tot = load.driver_total_pay_cents ?? gross + dh;
                const stripe =
                  i % 2 === 0 ? "bg-[#1A1C1E]" : "bg-[#16181A]/90";
                const emailDefault = driver.contact_email?.trim() ?? "";
                return (
                  <tr
                    key={load.id}
                    className={`border-b border-white/[0.06] ${stripe}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {driver.full_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {load.id.slice(0, 8)}…
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-slate-300">
                      {load.origin} → {load.destination}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-200">
                      ${(gross / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-200">
                      ${(dh / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-300">
                      ${(tot / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          disabled={!!busyKey || !fin}
                          onClick={() => void downloadPdf(load, driver)}
                          className={btnPrimary}
                        >
                          {busyKey === `dl-${load.id}` ? "…" : "Download PDF"}
                        </button>
                        <button
                          type="button"
                          disabled={!!busyKey || !fin || !emailDefault}
                          title={
                            emailDefault
                              ? undefined
                              : "Add driver contact email"
                          }
                          onClick={() =>
                            void emailPdf(load, driver, emailDefault)
                          }
                          className={btnPrimary}
                        >
                          {busyKey === `em-${load.id}` ? "…" : "Email driver"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
