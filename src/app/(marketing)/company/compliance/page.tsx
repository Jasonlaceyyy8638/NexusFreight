import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHalfHero } from "@/components/marketing/MarketingHalfHero";

export const metadata: Metadata = {
  title: "Compliance | NexusFreight",
  description:
    "FMCSA API integration for real-time MC and DOT verification and active authority checks.",
};

export default function ComplianceCompanyPage() {
  return (
    <>
      <MarketingHalfHero
        eyebrow="Company"
        title="Compliance & carrier verification"
        description="Every carrier record can be anchored to the federal motor carrier register—so the legal entity and authority you operate with match what FMCSA publishes in real time."
      />
      <div className="mx-auto max-w-3xl flex-1 px-6 py-12 sm:py-14">
        <div className="space-y-10 text-base leading-relaxed text-slate-400">
          <section>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              FMCSA API integration
            </h2>
            <p className="mt-4">
              NexusFreight integrates with{" "}
              <strong className="font-medium text-slate-200">
                FMCSA QCMobile / Safer
              </strong>
              -class data sources so MC and DOT lookups return the{" "}
              <strong className="font-medium text-slate-200">
                legal business name
              </strong>
              , identifiers, and{" "}
              <strong className="font-medium text-slate-200">
                authority status
              </strong>{" "}
              the government shows publicly. That means onboarding is not
              &ldquo;trust whatever someone typed&rdquo;—it is verified against
              the same record shippers and insurers already use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Real-time MC / DOT verification
            </h2>
            <p className="mt-4">
              When a user enters an MC number, NexusFreight retrieves current
              FMCSA data and locks the{" "}
              <strong className="font-medium text-slate-200">
                legal entity name
              </strong>{" "}
              to that response. DOT numbers and operating authority signals are
              shown before credentials are created, so your platform only
              activates accounts that reflect a real, queryable carrier—not a
              placeholder profile.
            </p>
            <p className="mt-4">
              <strong className="font-medium text-slate-200">
                Active authority
              </strong>{" "}
              is surfaced at signup. If authority is inactive, teams see it
              immediately and can gate operations accordingly—critical for
              brokerages that need defensible onboarding trails.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Your obligations remain yours
            </h2>
            <p className="mt-4">
              NexusFreight provides tooling and verification signals; your
              brokerage or carrier remains responsible for contracts, insurance,
              and operating authority compliance. Our job is to make the data you
              rely on{" "}
              <strong className="font-medium text-slate-200">
                timely, queryable, and aligned with FMCSA
              </strong>
              .
            </p>
          </section>

          <p className="border-t border-white/[0.06] pt-10">
            <Link
              href="/resources/security"
              className="text-sm font-semibold text-slate-300 transition-colors hover:text-blue-500"
            >
              Read security &amp; RLS overview →
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
