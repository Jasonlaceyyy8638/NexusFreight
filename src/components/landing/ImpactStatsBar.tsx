/** Slim trust strip below the hero — electric blue highlights. */
export function ImpactStatsBar() {
  const stats = [
    { highlight: "98%", rest: "Sync Reliability" },
    { highlight: "Instant", rest: "Settlements" },
    { highlight: "24/7", rest: "Data Security" },
  ] as const;

  return (
    <div
      className="border-y border-white/5 bg-[#3B82F6]/10 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-3.5"
      role="region"
      aria-label="Platform highlights"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 md:gap-10">
        {stats.map((s) => (
          <div
            key={s.rest}
            className="flex flex-1 flex-col items-center justify-center text-center sm:min-w-0"
          >
            <p className="text-sm font-semibold leading-tight sm:text-base">
              <span className="text-[#3B82F6]">{s.highlight}</span>
              <span className="text-slate-300"> {s.rest}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
