import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHalfHero } from "@/components/marketing/MarketingHalfHero";

export const metadata: Metadata = {
  title: "ELD Integrations | NexusFreight",
  description:
    "Samsara, Motive, and Geotab—API-driven telematics for check-call automation and live GPS in NexusFreight.",
};

export default function EldIntegrationsPage() {
  return (
    <>
      <MarketingHalfHero
        eyebrow="Resources"
        title="ELD integrations that actually move operations"
        description="NexusFreight connects to leading telematics platforms through their vendor APIs so your team spends less time chasing status—and more time covering freight."
      />
      <div className="mx-auto max-w-3xl flex-1 px-6 py-12 sm:py-14">
        <div className="space-y-10 text-base leading-relaxed text-slate-400">
          <section>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Providers we build around
            </h2>
            <ul className="mt-5 list-disc space-y-3 pl-5">
              <li>
                <strong className="font-medium text-slate-200">Samsara</strong>{" "}
                — vehicle location, duty status context, and asset lists via
                Samsara&apos;s REST APIs. NexusFreight normalizes positions for
                map and dispatch views so check-calls become exception-based,
                not routine.
              </li>
              <li>
                <strong className="font-medium text-slate-200">Motive</strong>{" "}
                — fleet visibility endpoints for real-time GPS pings and driver
                asset linkage. Use them to confirm en-route progress against the
                lane you booked—without dialing the cab.
              </li>
              <li>
                <strong className="font-medium text-slate-200">Geotab</strong>{" "}
                — MyGeotab feeds for device positions and vehicle metadata.
                NexusFreight maps those signals into carrier-scoped views so
                agencies managing many MCs still see one coherent layer per
                client.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Automating check-calls with API data
            </h2>
            <p className="mt-4">
              Instead of manual &ldquo;where are you?&rdquo; calls, NexusFreight
              ingests authorized telematics streams and surfaces{" "}
              <strong className="font-medium text-slate-200">
                real-time GPS pings
              </strong>{" "}
              on the live map. Dispatchers see movement relative to the assigned
              load and corridor—so outreach is targeted to exceptions (dwell,
              diversion risk, or missing assignment) rather than every load on
              the board.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              What you get in the product
            </h2>
            <p className="mt-4">
              Per-carrier ELD connections, token storage, and org-scoped
              queries mean each agency keeps a clean separation between client
              fleets. The same API discipline powers future automation: status
              hints, geofenced milestones, and tighter handoffs between
              operations and settlements.
            </p>
          </section>

          <p className="border-t border-white/[0.06] pt-10">
            <Link
              href="/auth/signup"
              className="inline-flex rounded-md bg-[#007bff] px-6 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(0,123,255,0.2)] transition-opacity hover:opacity-90"
            >
              Join the Beta
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
