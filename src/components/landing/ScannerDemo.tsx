"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, ScanLine } from "lucide-react";

type Phase = "idle" | "scanning" | "done";

const PICKUP_TEXT =
  "Dallas, TX · 100 Industrial Pkwy · Apr 15 · 08:00–14:00";
const DELIVERY_TEXT =
  "Atlanta, GA · 2500 Logistics Blvd · Apr 17 · FCFS";
const WEIGHT_TEXT = "42,000 lbs";

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function typeWriter(
  full: string,
  setValue: (s: string) => void,
  msPerChar: number,
  signal: AbortSignal
) {
  setValue("");
  for (let i = 0; i <= full.length; i++) {
    if (signal.aborted) return;
    setValue(full.slice(0, i));
    if (i < full.length) {
      await delay(msPerChar);
      if (signal.aborted) return;
    }
  }
}

/**
 * Interactive landing demo: mock PDF scan + typewriter fields (for screen recordings).
 */
export function ScannerDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [weight, setWeight] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  const reset = useCallback(() => {
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
    setPickup("");
    setDelivery("");
    setWeight("");
  }, []);

  const runScan = useCallback((resetFirst: boolean) => {
    if (phaseRef.current === "scanning") return;
    if (resetFirst) {
      reset();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setPhase("scanning");
    setPickup("");
    setDelivery("");
    setWeight("");

    scanTimerRef.current = window.setTimeout(() => {
      scanTimerRef.current = null;
      void (async () => {
        try {
          setPhase("done");
          await typeWriter(PICKUP_TEXT, setPickup, 22, signal);
          await typeWriter(DELIVERY_TEXT, setDelivery, 20, signal);
          await typeWriter(WEIGHT_TEXT, setWeight, 28, signal);
        } catch {
          /* aborted */
        }
      })();
    }, 3000);
  }, [reset]);

  /** Auto-start once on mount (short delay so the section paints). */
  useEffect(() => {
    const startId = window.setTimeout(() => {
      runScan(false);
    }, 550);
    return () => {
      window.clearTimeout(startId);
    };
  }, [runScan]);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const scanning = phase === "scanning";

  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Futuristic frame */}
      <div
        className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#050508] p-1 shadow-[0_0_0_1px_rgba(0,123,255,0.12),0_24px_80px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(0,123,255,0.08) 0%, transparent 42%),
            linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 24px 24px, 24px 24px",
        }}
      >
        <div className="pointer-events-none absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#007bff]/12 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />

        <div className="relative rounded-[0.875rem] border border-white/[0.06] bg-gradient-to-b from-zinc-900/90 to-[#0a0a0c] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#007bff]/35 bg-[#007bff]/10 text-[#5eb0ff]">
                <ScanLine className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400/90">
                  Nexus AI
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Rate confirmation parser
                </p>
              </div>
            </div>
            {phase === "done" ? (
              <button
                type="button"
                onClick={() => runScan(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:border-cyan-500/30 hover:text-slate-200"
              >
                <RefreshCw className="h-3 w-3" aria-hidden />
                Replay
              </button>
            ) : null}
          </div>

          {/* Mock PDF */}
          <div className="relative mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0c0f] shadow-inner">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(148,163,184,0.06) 11px, rgba(148,163,184,0.06) 12px)",
              }}
              aria-hidden
            />

            <div className="relative aspect-[4/3] min-h-[200px] p-4 sm:p-5">
              {/* Paper */}
              <div className="relative mx-auto h-full max-h-[220px] overflow-hidden rounded-md border border-slate-600/40 bg-gradient-to-br from-slate-100 via-white to-slate-100 shadow-lg sm:max-h-[260px]">
                <div className="border-b border-slate-300/80 bg-slate-200/60 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
                    Rate confirmation
                  </p>
                  <div className="mt-2 h-1.5 w-2/3 rounded bg-slate-300/90" />
                  <div className="mt-1.5 h-1 w-1/2 rounded bg-slate-300/70" />
                </div>
                <div className="space-y-2 p-3">
                  <div className="h-1 rounded bg-slate-300/80" />
                  <div className="h-1 w-[92%] rounded bg-slate-200" />
                  <div className="h-1 w-4/5 rounded bg-slate-200" />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="h-8 rounded bg-slate-200/90" />
                    <div className="h-8 rounded bg-slate-200/90" />
                  </div>
                  <div className="h-1 w-full rounded bg-slate-200/80" />
                  <div className="h-1 w-3/4 rounded bg-slate-200/70" />
                </div>

                {/* Scan line */}
                {scanning ? (
                  <div
                    className="scanner-demo-sweep-active pointer-events-none absolute inset-x-2 z-10 h-16 sm:inset-x-3"
                    style={{
                      background:
                        "linear-gradient(to bottom, transparent 0%, rgba(0,180,255,0.12) 35%, rgba(0,123,255,0.85) 50%, rgba(0,180,255,0.12) 65%, transparent 100%)",
                      boxShadow:
                        "0 0 24px 2px rgba(0, 153, 255, 0.45), 0 0 60px 8px rgba(0, 123, 255, 0.2)",
                    }}
                    aria-hidden
                  />
                ) : null}
              </div>

              {scanning ? (
                <p className="scanner-demo-scanning-pulse absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#007bff]/40 bg-black/70 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300 shadow-[0_0_20px_rgba(0,123,255,0.35)] backdrop-blur-sm">
                  Scanning…
                </p>
              ) : null}
            </div>
          </div>

          {/* Extracted fields */}
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span className="h-px w-4 bg-cyan-500/50" aria-hidden />
                Pickup
              </span>
              <div className="min-h-[2.75rem] rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-sm text-cyan-100/95 shadow-[inset_0_0_0_1px_rgba(0,123,255,0.08)]">
                {pickup}
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span className="h-px w-4 bg-cyan-500/50" aria-hidden />
                Delivery
              </span>
              <div className="min-h-[2.75rem] rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-sm text-cyan-100/95 shadow-[inset_0_0_0_1px_rgba(0,123,255,0.08)]">
                {delivery}
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span className="h-px w-4 bg-cyan-500/50" aria-hidden />
                Weight
              </span>
              <div className="min-h-[2.75rem] rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-sm tabular-nums text-cyan-100/95 shadow-[inset_0_0_0_1px_rgba(0,123,255,0.08)]">
                {weight}
                {phase === "done" && weight === WEIGHT_TEXT ? (
                  <span
                    className="ml-0.5 inline-block h-4 w-px animate-pulse bg-cyan-400/90"
                    aria-hidden
                  />
                ) : null}
              </div>
            </label>
          </div>

          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
            {scanning
              ? "Scanning document…"
              : phase === "done"
                ? "Replay above to run again"
                : "Starting…"}
          </p>
        </div>
      </div>
    </div>
  );
}
