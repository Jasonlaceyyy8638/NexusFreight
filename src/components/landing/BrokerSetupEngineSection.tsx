import Link from "next/link";
import { BellRing, Building2, FileStack, ShieldCheck } from "lucide-react";

const pillars = [
  {
    title: "Complete Compliance Suite",
    body: "Manage MC Authority, W-9s, Insurance COIs, and Factoring notices in one centralized location.",
    Icon: ShieldCheck,
  },
  {
    title: "Smart Expiry Alerts",
    body: "Never lose a load to expired insurance. Our system monitors your documents and alerts you before they lapse.",
    Icon: BellRing,
  },
  {
    title: "Instant PDF Stitching",
    body: "We automatically bundle your carrier’s credentials into a professional PDF packet and email it directly to brokers from your dashboard.",
    Icon: FileStack,
  },
  {
    title: "Dispatcher Optimized",
    body: "Manage separate, secure setup packets for every carrier in your fleet from a single agency login.",
    Icon: Building2,
  },
] as const;

/** Professional-grade broker setup packet marketing (#features on home). */
export function BrokerSetupEngineSection() {
  return (
    <section
      id="features"
      className="border-t border-white/[0.06] px-6 py-20 font-[family-name:var(--font-inter)] sm:py-28"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl text-center">
        <h2
          id="features-heading"
          className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          The Ultimate Broker Setup Engine.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg font-medium leading-relaxed text-slate-300">
          Everything a broker requires, bundled and sent in one click.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-6xl gap-10 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {pillars.map(({ title, body, Icon }) => (
          <div
            key={title}
            className="flex flex-col items-center text-center lg:items-start lg:text-left"
          >
            <span className="inline-flex rounded-xl border border-[#3B82F6]/20 bg-[#3B82F6]/10 p-3 text-[#3B82F6]">
              <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </span>
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">
              {body}
            </p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <Link
          href="#pricing"
          className="inline-flex min-w-[200px] items-center justify-center rounded-md bg-[#007bff] px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(0,123,255,0.25)] transition-colors hover:bg-[#0066dd]"
        >
          See plans &amp; pricing
        </Link>
        <Link
          href="/product-tour"
          className="inline-flex min-w-[200px] items-center justify-center rounded-md border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:border-white/35 hover:bg-white/10"
        >
          Take the product tour
        </Link>
      </div>

      <p className="mx-auto mt-12 max-w-xl text-center text-sm text-slate-500">
        Need fleet visibility?{" "}
        <Link
          href="/resources/live-map"
          className="font-medium text-slate-300 underline decoration-white/15 underline-offset-4 transition-colors hover:text-[#3B82F6] hover:decoration-[#3B82F6]/40"
        >
          Explore the Live Map
        </Link>
      </p>
    </section>
  );
}
