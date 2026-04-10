import Link from "next/link";
import {
  BadgeDollarSign,
  LayoutDashboard,
  RadioTower,
} from "lucide-react";

const FEATURES = [
  {
    id: "command-center",
    title: "Command Center",
    description:
      "One workspace for every MC you manage—live snapshots of loads, fleet, and revenue without cross-client noise. Your portfolio stays yours.",
    href: "/product/command-center",
    Icon: LayoutDashboard,
  },
  {
    id: "dispatch",
    title: "Dispatch Automation",
    description:
      "Driver-ready handoffs when loads move to dispatched. Lanes, rates, and assignments stay attached so the cab matches what dispatch booked.",
    href: "/product/dispatch",
    Icon: RadioTower,
  },
  {
    id: "settlements",
    title: "Real-Time Settlements",
    description:
      "Carrier-scoped PDFs from delivered activity, emailed to the billing inbox—repeatable, professional, and audit-friendly for every client carrier.",
    href: "/product/settlements",
    Icon: BadgeDollarSign,
  },
] as const;

export function FeatureCardsGrid() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
      {FEATURES.map(({ id, title, description, href, Icon }) => (
        <article
          key={id}
          id={id}
          className="group flex flex-col rounded-xl border border-white/10 bg-[#1A1C1E] px-6 py-10 text-center font-[family-name:var(--font-inter)] transition-all duration-300 hover:border-blue-500/50 hover:shadow-2xl sm:px-8"
        >
          <div className="mb-6 flex justify-center">
            <span className="inline-flex rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/10 p-3.5 text-[#3B82F6] transition-colors group-hover:border-[#3B82F6]/40">
              <Icon className="h-8 w-8" strokeWidth={1.75} aria-hidden />
            </span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-white">
            {title}
          </h3>
          <p className="mt-4 flex-1 text-base leading-relaxed text-slate-400">
            {description}
          </p>
          <div className="mt-8">
            <Link
              href={href}
              className="inline-flex text-sm font-semibold tracking-wide text-slate-300 transition-colors hover:text-[#3B82F6]"
            >
              Learn more
              <span className="ml-1.5" aria-hidden>
                →
              </span>
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

/** Command Center, Dispatch, Settlements — pairs with BrokerSetupEngineSection on home. */
export function PlatformCapabilitiesSection() {
  return (
    <section
      className="border-t border-white/[0.06] px-6 pb-20 pt-14 font-[family-name:var(--font-inter)] sm:pb-28 sm:pt-16"
      aria-labelledby="platform-capabilities-heading"
    >
      <div className="mx-auto max-w-6xl text-center">
        <h2
          id="platform-capabilities-heading"
          className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
        >
          Core platform capabilities
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
          Command, dispatch, and settlements—the rest of your agency workflow in one
          workspace.
        </p>
      </div>
      <div className="mt-10 sm:mt-12">
        <FeatureCardsGrid />
      </div>
    </section>
  );
}
