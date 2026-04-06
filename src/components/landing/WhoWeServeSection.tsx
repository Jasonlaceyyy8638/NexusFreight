import Link from "next/link";

const cards = [
  {
    title: "Dispatchers",
    body: "One command center for every load you touch—status discipline from draft to delivered, driver handoffs that match what you booked, and fewer check calls.",
    href: "/product/dispatch",
    learnMore: "Learn more about Dispatch",
  },
  {
    title: "Carriers",
    body: "Carrier-scoped settlements, ELD-aware visibility, and MC/DOT-aware workflows so your back office and the road stay aligned without spreadsheet chaos.",
    href: "/product/settlements",
    learnMore: "Learn more about Settlements",
  },
] as const;

export function WhoWeServeSection() {
  return (
    <section
      className="border-t border-white/[0.06] px-6 py-16 font-[family-name:var(--font-inter)] sm:py-20"
      aria-labelledby="who-we-serve-heading"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="who-we-serve-heading"
          className="text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          Built for Every Side of the Road.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-slate-400">
          Whether you run the office or the fleet, NexusFreight keeps dispatch,
          compliance, and settlements on one platform.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
          {cards.map((c) => (
            <article
              key={c.title}
              className="flex flex-col rounded-xl border border-white/10 bg-[#1A1C1E] p-8 sm:p-10"
            >
              <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {c.title}
              </h3>
              <p className="mt-4 flex-1 text-base leading-relaxed text-slate-400">
                {c.body}
              </p>
              <div className="mt-8">
                <Link
                  href={c.href}
                  className="inline-flex text-sm font-semibold text-[#3B82F6] transition-colors hover:text-[#60A5FA]"
                >
                  {c.learnMore}
                  <span className="ml-1.5" aria-hidden>
                    →
                  </span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
