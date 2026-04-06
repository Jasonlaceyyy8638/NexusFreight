const partners = [
  { name: "Motive", sub: "ELD", status: "active" as const },
  { name: "Samsara", sub: "Fleet", status: "comingSoon" as const },
  { name: "Geotab", sub: "Telematics", status: "comingSoon" as const },
  { name: "DAT", sub: "Load board", status: "comingSoon" as const },
];

const COMING_SOON_DETAIL =
  "Integration Coming Soon - Join the Beta for early access." as const;

/** Slim dark ribbon: ghost wordmarks + blue “Coming Soon” hovers. */
export function IntegrationPartnersSection() {
  return (
    <section
      className="border-y border-white/5 bg-gradient-to-b from-[#111315] via-[#111315] to-[#0e1012] px-4 py-6 font-[family-name:var(--font-inter)] sm:px-6 sm:py-8 md:py-10"
      aria-labelledby="integration-partners-heading"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <h2
          id="integration-partners-heading"
          className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500"
        >
          Natively integrated with
        </h2>

        <div className="mt-5 grid w-full grid-cols-2 place-items-center gap-x-4 gap-y-5 overflow-visible sm:mt-6 sm:gap-x-8 sm:gap-y-6 md:mt-7 md:grid-cols-4 md:gap-x-6 md:gap-y-0 lg:gap-x-10">
          {partners.map((p) => {
            const comingSoon = p.status === "comingSoon";
            return (
              <div
                key={p.name}
                className={
                  comingSoon
                    ? "group/cs relative flex min-w-0 max-w-full cursor-not-allowed flex-col items-center text-center outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111315]"
                    : "group flex min-w-0 max-w-full flex-col items-center text-center"
                }
                tabIndex={comingSoon ? 0 : undefined}
                aria-label={
                  comingSoon ? `${p.name}: ${COMING_SOON_DETAIL}` : undefined
                }
              >
                <div
                  className={
                    comingSoon
                      ? "flex h-10 w-full items-center justify-center grayscale opacity-40 transition-all duration-300 ease-out group-hover/cs:opacity-100 group-hover/cs:grayscale-0"
                      : "flex h-10 w-full cursor-default items-center justify-center grayscale opacity-40 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:grayscale-0"
                  }
                >
                  <span className="max-w-full truncate text-lg font-black leading-none tracking-tight text-white sm:text-xl">
                    {p.name}
                  </span>
                </div>
                <span className="mt-1 block max-w-full truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {p.sub}
                </span>

                {comingSoon ? (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-[min(100%,calc(100vw-2rem))] max-w-[240px] -translate-x-1/2 rounded-md bg-[#3B82F6] px-2.5 py-1.5 text-center opacity-0 shadow-lg transition-opacity duration-200 group-hover/cs:opacity-100 group-focus-visible/cs:opacity-100"
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-white">
                      Coming Soon
                    </span>
                    <span className="mt-1 block text-[9px] font-medium leading-snug text-white/95">
                      {COMING_SOON_DETAIL}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
