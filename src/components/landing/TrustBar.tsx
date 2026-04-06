const partners = [
  { name: "Samsara", sub: "Fleet" },
  { name: "Motive", sub: "ELD" },
  { name: "DAT", sub: "Load board" },
];

export function TrustBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-full ${className}`}
      role="region"
      aria-label="Integration partners"
    >
      <p className="mb-8 text-center text-[10px] font-bold tracking-[0.22em] text-slate-400">
        NATIVELY INTEGRATED WITH
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8 sm:gap-x-20">
        {partners.map((p) => (
          <div
            key={p.name}
            className="flex min-w-[96px] flex-col items-center grayscale-[0.35] contrast-125"
          >
            <span className="text-xl font-black tracking-tight text-slate-100 sm:text-2xl">
              {p.name}
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-slate-300">
              {p.sub}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
