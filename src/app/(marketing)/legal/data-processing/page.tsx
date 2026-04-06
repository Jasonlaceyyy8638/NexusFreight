import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHalfHero } from "@/components/marketing/MarketingHalfHero";

export const metadata: Metadata = {
  title: "Data Processing | NexusFreight",
  description: "Data processing summary for NexusFreight.",
};

export default function DataProcessingLegalPage() {
  return (
    <>
      <MarketingHalfHero
        eyebrow="Legal"
        title="Data processing"
        description="How operational data flows through NexusFreight and your Supabase project."
      />
      <div className="mx-auto max-w-3xl flex-1 px-6 py-12 text-base leading-relaxed text-slate-400 sm:py-14">
        <p>
          Load, carrier, driver, settlement, and document data are stored in
          your Supabase project with organization-scoped access. Email and SMS
          use configured providers (e.g. SendGrid, Twilio) when you trigger
          those actions.
        </p>
        <p className="mt-6">
          For a formal DPA, contact{" "}
          <a
            href="mailto:info@nexusfreight.tech"
            className="text-slate-300 underline decoration-white/20 underline-offset-2 transition-colors hover:text-blue-500"
          >
            info@nexusfreight.tech
          </a>
          .
        </p>
        <p className="mt-10">
          <Link
            href="/auth/signup"
            className="inline-flex rounded-md bg-[#007bff] px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Join the Beta
          </Link>
        </p>
      </div>
    </>
  );
}
