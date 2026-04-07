"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Shield } from "lucide-react";

function StaticCarrierRow({
  blocked,
}: {
  blocked: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border px-4 py-3 ${
        blocked
          ? "border-red-500/50 bg-red-950/35"
          : "border-emerald-500/35 bg-emerald-950/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            Summit Line Transport LLC
          </p>
          <p className="mt-1 text-xs text-slate-500">MC 884521 · DOT 1234567</p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            blocked
              ? "border border-red-400/40 bg-red-950/60 text-red-200"
              : "border border-emerald-500/40 bg-emerald-950/50 text-emerald-200"
          }`}
        >
          {blocked ? "Authority inactive" : "Verified"}
        </span>
      </div>
      {blocked ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-14deg] rounded-md border-[3px] border-red-500/90 bg-red-950/85 px-4 py-1.5 text-lg font-black uppercase tracking-[0.2em] text-red-400 shadow-[0_0_24px_rgba(239,68,68,0.35)]">
            Blocked
          </span>
        </div>
      ) : null}
    </div>
  );
}

function CarrierComplianceMockup() {
  const [blocked, setBlocked] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setBlocked((b) => !b);
    }, 3800);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <div
      className="relative mx-auto w-full max-w-md"
      aria-hidden
    >
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Carrier list — preview
      </p>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#121416] shadow-[0_24px_48px_-20px_rgba(0,0,0,0.75)]">
        <div className="border-b border-white/[0.06] px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            MC profiles
          </p>
        </div>
        <div className="relative p-4">
          {reduceMotion ? (
            <div className="space-y-3">
              <StaticCarrierRow blocked={false} />
              <StaticCarrierRow blocked />
              <p className="text-center text-[10px] text-slate-600">
                Reduced motion: active vs blocked states
              </p>
            </div>
          ) : (
            <>
              <div
                className={`relative overflow-hidden rounded-lg border px-4 py-3 transition-[border-color,background-color] duration-700 ease-in-out ${
                  blocked
                    ? "border-red-500/50 bg-red-950/35"
                    : "border-emerald-500/35 bg-emerald-950/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Summit Line Transport LLC
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      MC 884521 · DOT 1234567
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors duration-500 ${
                      blocked
                        ? "border border-red-400/40 bg-red-950/60 text-red-200"
                        : "border border-emerald-500/40 bg-emerald-950/50 text-emerald-200"
                    }`}
                  >
                    {blocked ? "Authority inactive" : "Verified"}
                  </span>
                </div>

                <div
                  className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
                    blocked ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="rotate-[-14deg] rounded-md border-[3px] border-red-500/90 bg-red-950/85 px-4 py-1.5 text-lg font-black uppercase tracking-[0.2em] text-red-400 shadow-[0_0_24px_rgba(239,68,68,0.35)]">
                    Blocked
                  </span>
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] text-slate-600">
                Illustration — automated nightly FMCSA sync
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function NexusFreightShieldSection() {
  return (
    <section
      id="nexusfreight-shield"
      className="border-t border-white/[0.06] bg-[#0D0E10] px-6 py-20 font-[family-name:var(--font-inter)] sm:py-28"
      aria-labelledby="nexus-shield-heading"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div className="text-center lg:text-left">
          <div className="mb-8 flex justify-center lg:justify-start">
            <div className="relative flex items-center justify-center gap-3">
              <span
                className="absolute -inset-8 rounded-full bg-emerald-500/20 blur-3xl"
                aria-hidden
              />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-emerald-500/35 bg-emerald-500/10 shadow-[0_0_48px_-8px_rgba(16,185,129,0.45)] sm:h-28 sm:w-28">
                <Shield
                  className="h-14 w-14 text-emerald-400 sm:h-16 sm:w-16"
                  strokeWidth={1.25}
                  aria-hidden
                />
                <span className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0D0E10] bg-[#16181A] shadow-lg">
                  <CheckCircle2
                    className="h-7 w-7 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.7)] motion-safe:animate-pulse"
                    strokeWidth={2}
                    aria-hidden
                  />
                </span>
              </div>
            </div>
          </div>

          <h2
            id="nexus-shield-heading"
            className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            NexusFreight Shield: 24/7 Compliance Monitoring
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400 lg:mx-0">
            NexusFreight never sleeps. While you&apos;re off the clock, our
            system connects directly to the FMCSA every night to verify your
            carriers. If a carrier loses their insurance or authority at
            midnight, they are automatically blocked in your dashboard by 2:00
            AM. Total liability protection, zero manual effort.
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <CarrierComplianceMockup />
        </div>
      </div>
    </section>
  );
}
