/**
 * Browser-window product teaser: logistics-style dashboard mock + shimmer overlay.
 */
function LogisticsDashboardMock() {
  return (
    <div className="flex h-full min-h-[220px] w-full bg-[#121416] sm:min-h-[260px]">
      <aside
        className="hidden w-12 shrink-0 flex-col gap-3 border-r border-white/[0.06] py-4 pl-2 pr-2 sm:flex"
        aria-hidden
      >
        {[0.3, 0.2, 0.25, 0.15].map((o, i) => (
          <div
            key={i}
            className="mx-auto h-8 w-8 rounded-md bg-white/[0.08]"
            style={{ opacity: o + 0.5 }}
          />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Command Center
            </p>
            <p className="text-xs font-semibold text-slate-300">
              Live network · Midwest corridor
            </p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-md border border-white/10 bg-[#16181A] px-2.5 py-1 text-[10px] text-slate-400">
              Filters
            </span>
            <span className="rounded-md bg-[#007bff]/90 px-2.5 py-1 text-[10px] font-semibold text-white">
              New load
            </span>
          </div>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { k: "Active loads", v: "127" },
            { k: "In transit", v: "84" },
            { k: "On-time", v: "96%" },
          ].map((s) => (
            <div
              key={s.k}
              className="rounded-lg border border-white/10 bg-[#16181A] px-2 py-2 sm:px-3 sm:py-2.5"
            >
              <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                {s.k}
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-white sm:text-xl">
                {s.v}
              </p>
            </div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0D0F11] sm:col-span-2">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,123,255,0.12) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,123,255,0.08) 1px, transparent 1px)
                `,
                backgroundSize: "20px 20px",
              }}
            />
            <div className="relative flex h-full min-h-[120px] flex-col p-2 sm:min-h-[140px]">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                Fleet map
              </p>
              <div className="relative mt-2 flex-1">
                <div className="absolute left-[12%] top-[20%] h-2.5 w-2.5 rounded-full bg-[#007bff] shadow-[0_0_10px_rgba(0,123,255,0.7)]" />
                <div className="absolute left-[45%] top-[55%] h-2.5 w-2.5 rounded-full bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                <div className="absolute right-[18%] top-[35%] h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                <svg
                  className="absolute inset-0 h-full w-full text-[#007bff]/35"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path
                    d="M 20 80 Q 80 40 140 100 T 260 60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex min-h-[120px] flex-col overflow-hidden rounded-lg border border-white/10 bg-[#16181A] sm:col-span-3 sm:min-h-0">
            <div className="grid grid-cols-[1.4fr_0.7fr_0.6fr] gap-2 border-b border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Lane / ref</span>
              <span>Carrier</span>
              <span>ETA</span>
            </div>
            <div className="flex-1 space-y-0 overflow-hidden">
              {[
                ["ORD → CMH · #NF-8841", "Summit", "14:20"],
                ["DFW → ATL · #NF-8842", "Continental", "02:15"],
                ["DEN → MCI · #NF-8843", "Summit", "22:40"],
                ["LAX → PHX · #NF-8844", "Linehaul Co", "06:05"],
              ].map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1.4fr_0.7fr_0.6fr] gap-2 border-b border-white/[0.04] px-2 py-2 text-[11px] last:border-0"
                >
                  <span className="truncate text-slate-300">{row[0]}</span>
                  <span className="truncate text-slate-500">{row[1]}</span>
                  <span className="tabular-nums text-slate-400">{row[2]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroProductPreview() {
  return (
    <div className="mx-auto w-[80vw] max-w-[min(80vw,1120px)]">
      <div
        className="overflow-hidden rounded-xl border border-white/10 bg-[#0D0E10] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.06]"
      >
        <div className="flex h-10 shrink-0 items-center gap-3 border-b border-white/10 bg-[#16181A] px-3 sm:h-11 sm:px-4">
          <div className="flex gap-1.5 sm:gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/90 sm:h-3 sm:w-3" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/90 sm:h-3 sm:w-3" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/90 sm:h-3 sm:w-3" />
          </div>
          <div className="mx-auto h-6 min-w-0 flex-1 max-w-lg rounded-md border border-white/10 bg-black/35 sm:h-7" />
        </div>
        <div className="relative max-h-[min(42vh,440px)] min-h-[200px] w-full overflow-hidden">
          <div className="h-full min-h-[200px] w-full select-none">
            <LogisticsDashboardMock />
          </div>
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0D0E10]/20 via-transparent to-[#0D0E10]/40"
            aria-hidden
          />
          <div className="landing-mockup-shimmer pointer-events-none absolute inset-0 overflow-hidden" aria-hidden />
        </div>
      </div>
    </div>
  );
}
