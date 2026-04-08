"use client";

import { ThumbsUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  declineActivityMessage,
  DRIVER_ACK_ACTIVITY_MESSAGE,
  DRIVER_DECLINE_REASONS,
  isLoadAcknowledgedByDriver,
} from "@/lib/driver-load-acknowledgement";
import { LOAD_STATUS_LABELS } from "@/lib/load-status-labels";
import type { Load, LoadActivityLogEntry, LoadStatus } from "@/types/database";
import { MobileStoreDownloadBadges } from "@/components/driver/MobileStoreDownloadBadges";
import { useNexusNativeDriverShell } from "@/lib/hooks/useNexusNativeDriverShell";

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
  const isNativeShell = useNexusNativeDriverShell();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const declineWrapRef = useRef<HTMLDivElement>(null);

  const statusLabel =
    LOAD_STATUS_LABELS[load.status as LoadStatus] ?? load.status;

  const acknowledged = isLoadAcknowledgedByDriver(load);
  const preTrip =
    load.status === "dispatched" || load.status === "notification_sent";
  const canDeliver = load.status === "in_transit";

  const canAcknowledge = preTrip && !acknowledged;
  const canStart = preTrip && acknowledged;
  const canDecline = preTrip && !acknowledged;

  useEffect(() => {
    if (!declineOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = declineWrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setDeclineOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [declineOpen]);

  async function acknowledgeLoad() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const nextLog = appendActivityLog(load, DRIVER_ACK_ACTIVITY_MESSAGE);
    const patch: Record<string, unknown> = { activity_log: nextLog };
    if (load.status === "notification_sent") {
      patch.status = "dispatched";
      patch.dispatched_at = new Date().toISOString();
    }
    const { error: err } = await supabase
      .from("loads")
      .update(patch)
      .eq("id", load.id);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await onUpdated();
  }

  async function declineLoad(reason: string) {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setDeclineOpen(false);
    const nextLog = appendActivityLog(load, declineActivityMessage(reason));
    const { error: err } = await supabase
      .from("loads")
      .update({
        status: "cancelled",
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
    <section className="rounded-2xl border border-white/10 bg-[#16181A] p-5 shadow-[inset_0_1px_0_0_rgba(0,123,255,0.06)] sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Active load
      </p>
      <p className="mt-1 text-2xl font-bold leading-snug tracking-tight text-white">
        {load.origin}
      </p>
      <p className="mt-3 text-lg font-semibold text-slate-200">
        → {load.destination}
      </p>
      <p className="mt-4 text-sm text-slate-400">
        Status: <span className="font-medium text-slate-300">{statusLabel}</span>
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {preTrip ? (
          <>
            <div className="flex flex-col gap-4">
              <div
                className="flex items-center justify-center gap-4 rounded-xl border border-white/10 bg-[#121416] px-4 py-3.5"
                title="Assignment progress"
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide sm:text-[11px] ${acknowledged ? "text-emerald-400" : "text-slate-300"}`}
                >
                  Assigned
                </span>
                <span className="text-lg leading-none text-slate-500" aria-hidden>
                  →
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide sm:text-[11px] ${acknowledged ? "text-emerald-400" : "text-slate-500"}`}
                >
                  Acknowledged
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {canAcknowledge ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void acknowledgeLoad()}
                    className="flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#22c55e] px-4 py-3 text-sm font-bold leading-snug text-white shadow-[0_8px_24px_rgba(34,197,94,0.25)] transition hover:bg-[#1fb855] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
                  >
                    <ThumbsUp
                      className="h-[18px] w-[18px] shrink-0"
                      strokeWidth={2.5}
                    />
                    <span className="text-center">Acknowledge Load</span>
                  </button>
                ) : null}
                {canDecline ? (
                  <div ref={declineWrapRef} className="relative w-full">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setDeclineOpen((o) => !o)}
                      className="min-h-[50px] w-full rounded-xl border-2 border-white/15 bg-[#1c1f22] px-4 py-3 text-sm font-bold leading-snug text-slate-100 transition hover:bg-white/5 disabled:opacity-50 sm:text-base"
                    >
                      Decline Load
                    </button>
                    {declineOpen ? (
                      <ul
                        className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-[min(40vh,240px)] overflow-y-auto rounded-xl border border-white/10 bg-[#1c1f22] py-1 text-left text-sm shadow-xl"
                        role="listbox"
                      >
                        {DRIVER_DECLINE_REASONS.map((r) => (
                          <li key={r}>
                            <button
                              type="button"
                              disabled={busy}
                              className="w-full px-4 py-3 text-left font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
                              onClick={() => void declineLoad(r)}
                            >
                              {r}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            {canStart ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void startTrip()}
                className="min-h-[52px] w-full rounded-xl bg-[#007bff] px-4 py-3 text-base font-bold text-white shadow-[0_0_24px_rgba(0,123,255,0.35)] transition hover:bg-[#1a8cff] disabled:opacity-50"
              >
                Start trip
              </button>
            ) : null}
          </>
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

        {!preTrip && !canDeliver ? (
          <p className="text-center text-sm text-slate-500">
            {load.status === "in_transit"
              ? "You’re in transit — confirm delivery when you arrive."
              : "Waiting on dispatch to assign or release this load."}
          </p>
        ) : null}
      </div>

      {!isNativeShell ? (
        <div className="mt-6 border-t border-white/10 pt-5">
          <MobileStoreDownloadBadges storeHref="/#lead-capture" />
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
