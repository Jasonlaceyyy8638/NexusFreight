import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHalfHero } from "@/components/marketing/MarketingHalfHero";
import { listPublishedResources } from "@/lib/resources/public-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources | Guides & articles | NexusFreight",
  description:
    "Practical guides for dispatch teams and carrier fleets: compliance, workflows, and operations. Free articles from NexusFreight.",
  openGraph: {
    title: "Resources | NexusFreight",
    description:
      "Guides and articles for dispatch, compliance, and carrier operations.",
  },
};

export default async function ResourcesHubPage() {
  const guides = await listPublishedResources();

  return (
    <>
      <MarketingHalfHero
        eyebrow="Resources"
        title="Guides & articles"
        description="Deep dives for dispatch teams and carrier fleets—compliance, day-to-day operations, and ways to automate repetitive work."
      />

      <section className="mx-auto w-full max-w-6xl flex-1 px-6 pb-20 pt-4 sm:pb-24">
        {guides.length === 0 ? (
          <p className="max-w-xl text-sm leading-relaxed text-slate-500">
            New guides are on the way. In the meantime, explore product areas or
            the{" "}
            <Link
              href="/help"
              className="text-sky-400 underline decoration-sky-500/30 underline-offset-2 hover:text-sky-300"
            >
              Help Center
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/resources/${g.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#0D0E10]/80 shadow-[0_12px_48px_-16px_rgba(0,0,0,0.55)] transition-[border-color,transform] hover:-translate-y-0.5 hover:border-sky-500/25"
                >
                  <div className="relative aspect-[16/9] w-full bg-slate-900/80">
                    {g.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote marketing URLs vary by host
                      <img
                        src={g.image_url}
                        alt=""
                        className="h-full w-full object-cover opacity-95 transition-opacity group-hover:opacity-100"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800/90 to-slate-950 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600"
                        aria-hidden
                      >
                        Guide
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400/90">
                      {g.category}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold leading-snug text-white group-hover:text-sky-100">
                      {g.title}
                    </h2>
                    {g.excerpt ? (
                      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-400">
                        {g.excerpt}
                      </p>
                    ) : null}
                    <p className="mt-4 text-xs font-medium text-sky-400/90">
                      Read guide{" "}
                      <span className="inline transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
