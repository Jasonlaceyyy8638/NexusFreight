"use client";

import { useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";

export function DashboardSettlementsPage() {
  const {
    orgType,
    carriers,
    loads,
    selectedCarrierId,
    setSelectedCarrierId,
    interactiveDemo,
    openDemoAccountGate,
    isCarrierOrg,
    permissions,
  } = useDashboardData();
  const fin = permissions.can_view_financials;
  const [busy, setBusy] = useState<"dl" | "email" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const carrier = carriers.find((c) => c.id === selectedCarrierId);
  const isDispatcher = orgType === "Agency";

  const buildPayload = () => {
    if (!carrier) return null;
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return {
      organizationName: "NexusFreight Operations",
      carrierName: carrier.name,
      carrierMc: carrier.mc_number,
      feePercent: carrier.fee_percent,
      serviceFeeType: carrier.service_fee_type ?? "percent",
      feeFlatCents: carrier.service_fee_flat_cents ?? null,
      weekStart: start.toISOString(),
      weekEnd: now.toISOString(),
      loads: loads.filter((l) => l.carrier_id === carrier.id),
    };
  };

  const downloadSettlement = async () => {
    const body = buildPayload();
    if (!body) {
      alert(isCarrierOrg ? "Carrier record not loaded." : "Select a carrier first.");
      return;
    }
    setBusy("dl");
    setMsg(null);
    try {
      const res = await fetch("/api/settlements/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        alert("Could not generate settlement PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `settlement-${carrier!.name.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  };

  const sendToCarrier = async () => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    const body = buildPayload();
    if (!body) {
      alert(isCarrierOrg ? "Carrier record not loaded." : "Select a carrier first.");
      return;
    }
    const to = carrier?.contact_email?.trim();
    if (!to) {
      setMsg(
        isCarrierOrg
          ? "Add a settlement email on your company profile (Internal Team → company profile)."
          : "Add a settlement email on the carrier profile first."
      );
      return;
    }
    setBusy("email");
    setMsg(null);
    try {
      const res = await fetch("/api/settlements/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, to }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error ?? "Could not send email");
        return;
      }
      setMsg("Settlement PDF emailed to carrier.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {isCarrierOrg ? "Payroll & reports" : "Revenue & settlements"}
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          {isCarrierOrg
            ? "Revenue & driver pay history"
            : "Weekly settlement PDF"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {isCarrierOrg
            ? "Review linehaul revenue and driver pay history for your fleet—not a broker settlement bill."
            : "Generate a carrier-scoped PDF for the last 7 days of delivered load activity."}
        </p>
      </header>

      {!fin ? (
        <div className="rounded-xl border border-white/10 bg-[#16181A]/50 p-6 opacity-60">
          <p className="text-sm text-slate-500">
            Financial reports are hidden for your account. Ask an admin to enable
            &ldquo;Can view financials&rdquo; in Team management.
          </p>
        </div>
      ) : null}

      <div
        className={`rounded-xl border border-white/10 bg-[#16181A]/90 p-6 ${
          !fin ? "pointer-events-none opacity-40" : ""
        }`}
      >
        {isCarrierOrg ? (
          <div className="text-sm text-slate-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fleet
            </span>
            <p className="mt-2 rounded-md border border-white/10 bg-[#121416] px-3 py-2.5 text-slate-100">
              {carrier?.name ?? "—"}
            </p>
          </div>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm text-slate-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Carrier
            </span>
            <select
              className="rounded-md border border-white/10 bg-[#121416] px-3 py-2.5 text-slate-100 outline-none focus:border-[#007bff]/50"
              value={selectedCarrierId ?? ""}
              onChange={(e) => setSelectedCarrierId(e.target.value || null)}
            >
              <option value="">— Select carrier —</option>
              {carriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {carrier?.contact_email ? (
          <p className="mt-2 text-xs text-slate-500">
            On file:{" "}
            <span className="text-slate-400">{carrier.contact_email}</span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-200/80">
            No settlement email on file — add one{" "}
            {isCarrierOrg
              ? "on your company profile (Internal Team)"
              : "under Carriers"}{" "}
            to enable SendGrid delivery.
          </p>
        )}

        {msg ? (
          <p className="mt-4 text-sm text-slate-400">{msg}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void downloadSettlement()}
            className="flex-1 rounded-md bg-[#007bff] py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(0,123,255,0.3)] hover:opacity-90 disabled:opacity-50"
          >
            {busy === "dl" ? "Generating…" : "Download PDF"}
          </button>
          {isDispatcher ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void sendToCarrier()}
              className="flex-1 rounded-md border border-white/15 bg-white/5 py-3 text-sm font-semibold text-slate-100 hover:border-[#007bff]/40 hover:bg-white/10 disabled:opacity-50"
            >
              {busy === "email" ? "Sending…" : "Send to carrier"}
            </button>
          ) : null}
        </div>
        {isDispatcher ? (
          <p className="mt-3 text-[11px] text-slate-600">
            Email uses SendGrid (
            <code className="text-slate-500">SENDGRID_API_KEY</code>,{" "}
            <code className="text-slate-500">SENDGRID_FROM_EMAIL</code>).
          </p>
        ) : null}
      </div>
    </div>
  );
}
