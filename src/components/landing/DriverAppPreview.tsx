"use client";

import { ThumbsUp } from "lucide-react";
import { useState } from "react";
import { MobileStoreDownloadBadges } from "@/components/driver/MobileStoreDownloadBadges";
import { DRIVER_DECLINE_REASONS } from "@/lib/driver-load-acknowledgement";
import { useNexusNativeDriverShell } from "@/lib/hooks/useNexusNativeDriverShell";

/**
 * Interactive mobile driver load preview for marketing (not wired to API).
 */
export function DriverAppPreview() {
  const isNativeShell = useNexusNativeDriverShell();
  const [acknowledged, setAcknowledged] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declinedReason, setDeclinedReason] = useState<string | null>(null);

  return (
    <div
      className="relative mx-auto w-full max-w-[340px] px-1 sm:max-w-[360px]"
      aria-hidden
    >
      <div className="rounded-[2.75rem] border-[10px] border-slate-900 bg-slate-900 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85)] ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[2rem] bg-[#0a0b0d]">
          <div className="flex justify-center pb-1 pt-3.5">
            <div className="h-7 w-[88px] rounded-full bg-black ring-1 ring-white/10" />
          </div>
          <div className="px-3.5 pb-8 pt-1 sm:px-4">
            <div className="rounded-[1.25rem] bg-white p-5 text-left text-slate-900 shadow-lg ring-1 ring-slate-200/80 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Active load
              </p>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Pickup</p>
                  <p className="mt-1 text-sm font-extrabold leading-snug tracking-tight sm:text-[15px]">
                    Columbus, OH
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Dropoff</p>
                  <p className="mt-1 text-sm font-extrabold leading-snug tracking-tight sm:text-[15px]">
                    Nashville, TN
                  </p>
                </div>
              </div>

              {declinedReason ? (
                <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-center text-xs font-medium leading-relaxed text-amber-900">
                  Preview: declined ({declinedReason})
                </p>
              ) : (
                <>
                  <div className="mt-6 space-y-4">
                    <div
                      className="flex items-center justify-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5"
                      title="Assignment progress"
                    >
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide sm:text-[11px] ${acknowledged ? "text-emerald-700" : "text-slate-700"}`}
                      >
                        Assigned
                      </span>
                      <span
                        className="text-lg leading-none text-slate-300"
                        aria-hidden
                      >
                        →
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide sm:text-[11px] ${acknowledged ? "text-emerald-700" : "text-slate-400"}`}
                      >
                        Acknowledged
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        tabIndex={-1}
                        disabled={acknowledged}
                        onClick={() => setAcknowledged(true)}
                        className={`flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#22c55e] px-4 py-3 text-sm font-bold leading-snug text-white disabled:cursor-default disabled:opacity-60 disabled:shadow-none sm:text-[15px] ${acknowledged ? "" : "driver-preview-acknowledge-glow"}`}
                      >
                        <ThumbsUp
                          className="h-[18px] w-[18px] shrink-0"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                        <span className="text-center">Acknowledge Load</span>
                      </button>
                      <div className="relative w-full">
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setDeclineOpen((o) => !o)}
                          className="min-h-[50px] w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold leading-snug text-slate-800 shadow-sm sm:text-[15px]"
                        >
                          Decline Load
                        </button>
                        {declineOpen ? (
                          <ul
                            className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 max-h-[min(40vh,240px)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-left text-sm shadow-lg"
                            role="listbox"
                          >
                            {DRIVER_DECLINE_REASONS.map((r) => (
                              <li key={r}>
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  className="w-full px-4 py-3 text-left font-medium text-slate-800 hover:bg-slate-50"
                                  onClick={() => {
                                    setDeclinedReason(r);
                                    setDeclineOpen(false);
                                  }}
                                >
                                  {r}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {!isNativeShell ? (
                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <MobileStoreDownloadBadges
                        storeHref="#lead-capture"
                        compact
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <p className="mt-4 text-center text-[10px] leading-relaxed text-slate-500">
              Preview — not functional
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
