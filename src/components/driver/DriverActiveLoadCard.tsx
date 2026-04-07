"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LOAD_STATUS_LABELS } from "@/lib/load-status-labels";
import type { Load, LoadActivityLogEntry, LoadStatus } from "@/types/database";

function appendActivityLog(
  load: Load,
  message: string
): LoadActivityLogEntry[] {
  const prev = Array.isArray(load.activity_log) ? load.activity_log : [];
  return [...prev, { at: new Date().toISOString(), message }];
}

type Props = {
  load: Load;
  onUpdated: () => Promise<void>;
};

export function DriverActiveLoadCard({ load, onUpdated }: Props) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusLabel =
    LOAD_STATUS_LABELS[load.status as LoadStatus] ?? load.status;

  const canStart =
    load.status === "dispatched" || load.status === "notification_sent";
  const canDeliver = load.status === "in_transit";

  async function startTrip() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const nextLog = appendActivityLog(load, "Trip started (driver app)");
    const { error: err } = await supabase
      .from("loads")
      .update({
        status: "in_transit",
        activity_log: nextLog,
      })
      .eq("id", load.id);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await onUpdated();
  }

  async function confirmDelivery() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const nextLog = appendActivityLog(load, "Delivery confirmed (driver app)");
    const { error: err } = await supabase
      .from("loads")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        activity_log: nextLog,
      })
      .eq("id", load.id);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await onUpdated();
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#16181A] p-5 shadow-[inset_0_1px_0_0_rgba(0,123,255,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Active load
      </p>
      <p className="mt-1 text-2xl font-bold leading-snug tracking-tight text-white">
        {load.origin}
      </p>
      <p className="mt-3 text-lg font-semibold text-slate-200">→ {load.destination}</p>
      <p className="mt-4 text-sm text-slate-400">
        Status: <span className="font-medium text-slate-300">{statusLabel}</span>
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {canStart ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void startTrip()}
            className="min-h-[52px] rounded-xl bg-[#007bff] px-4 text-base font-bold text-white shadow-[0_0_24px_rgba(0,123,255,0.35)] transition hover:bg-[#1a8cff] disabled:opacity-50"
          >
            Start trip
          </button>
        ) : null}
        {canDeliver ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirmDelivery()}
            className="min-h-[52px] rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 text-base font-bold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
          >
            Confirm delivery
          </button>
        ) : null}
        {!canStart && !canDeliver ? (
          <p className="text-center text-sm text-slate-500">
            {load.status === "in_transit"
              ? "You’re in transit — confirm delivery when you arrive."
              : "Waiting on dispatch to assign or release this load."}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
