import Link from "next/link";
import { FileText, MapPinned, Route } from "lucide-react";

const pillars = [
  {
    title: "See live movement",
    body: "ELD-backed visibility and load status—fewer “where’s my truck?” calls.",
    Icon: MapPinned,
  },
  {
    title: "Keep loads disciplined",
    body: "Draft to delivered with assignments and history your team can trust.",
    Icon: Route,
  },
  {
    title: "Close the money loop",
    body: "Settlement-ready handoffs when freight delivers—less inbox archaeology.",
    Icon: FileText,
  },
] as const;

/**
 * Bridges hero → pricing without repeating the dispatcher/carrier plan cards.
 */
export function LandingBridgeSection() {
  return (
    <section
      className="border-t border-white/[0.06] px-6 py-16 font-[family-name:var(--font-inter)] sm:py-20"
      aria-labelledby="bridge-heading"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="bridge-heading"
          className="text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          Run the full loop in one workspace
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-slate-400">
          NexusFreight ties what happens on the map to what happens in billing—so
          operations and back office aren’t fighting different versions of the truth.
        </p>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
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

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
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
      </div>
    </section>
  );
}
