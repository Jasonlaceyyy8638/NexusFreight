"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    id: "eld-security",
    question: "How secure is my ELD data?",
    answer:
      "Connections use OAuth 2.0 or vendor API tokens—your ELD passwords are not stored in NexusFreight. Location data is scoped to your organization and used only for operational features like maps and dispatch context, not sold to advertisers.",
  },
  {
    id: "multi-mc",
    question: "Can I manage multiple MC numbers?",
    answer:
      "Yes. NexusFreight is built for agencies and operators who run multiple motor carriers. Workspaces and data are organized so you can separate clients and fleets without cross-contamination.",
  },
  {
    id: "setup-fee",
    question: "Is there a setup fee?",
    answer:
      "Pricing is subscription-based; specific fees, trials, and onboarding costs will be confirmed at signup or in your order form. Contact us for a demo and current beta terms.",
  },
] as const;

export function LandingFaqAccordion() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section
      className="border-t border-white/[0.06] px-6 py-16 font-[family-name:var(--font-inter)] sm:py-24"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id="faq-heading"
          className="text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          Frequently asked questions
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-slate-400">
          Straight answers about security, scale, and pricing.
        </p>

        <div className="mt-12 space-y-3">
          {faqs.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-[#1A1C1E]/80"
              >
                <button
                  type="button"
                  id={`faq-trigger-${item.id}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${item.id}`}
                  onClick={() =>
                    setOpenId((prev) => (prev === item.id ? null : item.id))
                  }
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-white transition-colors hover:bg-white/[0.04] sm:px-6 sm:py-5"
                >
                  {item.question}
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>
                <div
                  id={`faq-panel-${item.id}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${item.id}`}
                  className={isOpen ? "block" : "hidden"}
                >
                  <div className="border-t border-white/[0.06] px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                    <p className="pt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
