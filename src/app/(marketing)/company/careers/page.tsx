import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHalfHero } from "@/components/marketing/MarketingHalfHero";

export const metadata: Metadata = {
  title: "Careers | NexusFreight",
  description: "Build logistics infrastructure with operators who ship every day.",
};

export default function CareersCompanyPage() {
  return (
    <>
      <MarketingHalfHero
        eyebrow="Company"
        title="Careers"
        description="We hire for depth in logistics, maps, and security—not generic résumés. Tell us what you want to build."
      />
      <section className="mx-auto max-w-2xl flex-1 px-6 py-14 text-center">
        <p className="text-sm leading-relaxed text-slate-400">
          Email{" "}
          <Link
            href="mailto:info@nexusfreight.tech?subject=Careers"
            className="font-semibold text-slate-200 transition-colors hover:text-blue-500"
          >
            info@nexusfreight.tech
          </Link>{" "}
          with your background and the problems you care about.
        </p>
        <Link
          href="/auth/signup"
          className="mt-10 inline-flex rounded-md bg-[#007bff] px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_28px_rgba(0,123,255,0.25)] transition-opacity hover:opacity-90"
        >
          Join the Beta
        </Link>
      </section>
    </>
  );
}
