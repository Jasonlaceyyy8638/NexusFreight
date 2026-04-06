import type { Metadata } from "next";
import { MarketingHalfHero } from "@/components/marketing/MarketingHalfHero";

export const metadata: Metadata = {
  title: "Support | NexusFreight",
  description: "24/7 support during beta—reach the NexusFreight team any time.",
};

export default function SupportResourcePage() {
  return (
    <>
      <MarketingHalfHero
        eyebrow="Resources"
        title="Support"
        description="We monitor inbound requests around the clock during beta. For implementation questions, incidents, or partnership inquiries, email the team directly."
      />
      <section className="mx-auto max-w-2xl flex-1 px-6 py-14 text-center sm:py-18">
        <a
          href="mailto:info@nexusfreight.tech"
          className="text-lg font-semibold text-slate-200 transition-colors hover:text-blue-500"
        >
          info@nexusfreight.tech
        </a>
        <p className="mt-6 text-sm leading-relaxed text-slate-500">
          Prefer to self-serve first? Visit the{" "}
          <a
            href="/help"
            className="text-slate-400 underline decoration-white/15 underline-offset-2 transition-colors hover:text-blue-500"
          >
            Help Center
          </a>{" "}
          for guides and FAQs.
        </p>
      </section>
    </>
  );
}
