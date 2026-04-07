"use client";

import { ChevronDown, Headset, Mail, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { getSupportResourcesAccordionFaqs } from "@/lib/help/faq-data";
import { openCrispChat } from "@/lib/support/open-crisp-chat";

function FaqBody({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <p className="text-sm leading-relaxed text-slate-400">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-medium text-slate-200">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

export function DashboardSupportResourcesPage() {
  const { isBetaUser } = useDashboardData();
  const accordionItems = getSupportResourcesAccordionFaqs();
  const [openId, setOpenId] = useState<string | null>(accordionItems[0]?.id ?? null);

  return (
    <div className="px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          Support &amp; Resources
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Get help by chat or email, browse common questions, or open a formal
          ticket when you need a tracked response.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-white/10 bg-[#16181A]/95 p-6 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.6)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#007bff]/15">
              <MessageCircle
                className="h-6 w-6 text-[#5aa9ff]"
                strokeWidth={2}
                aria-hidden
              />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">Live Chat</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
              Talk to us in real time. Best for quick questions while you&apos;re
              in the dashboard.
            </p>
            <button
              type="button"
              onClick={() => openCrispChat()}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#007bff] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0066dd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3395ff]"
            >
              Open live chat
            </button>
          </div>

          <div className="flex flex-col rounded-2xl border border-white/10 bg-[#16181A]/95 p-6 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.6)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-500/15">
              <Mail
                className="h-6 w-6 text-slate-300"
                strokeWidth={2}
                aria-hidden
              />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">
              Email Support
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
              Prefer email? Reach our team directly—we typically reply within one
              business day.
            </p>
            <a
              href="mailto:info@nexusfreight.tech?subject=NexusFreight%20support"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/10"
            >
              Email info@nexusfreight.tech
            </a>
          </div>
        </div>

        {isBetaUser && (
          <div
            className="mt-8 rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-950/80 via-[#14221c] to-[#0d1814] p-6 shadow-[0_0_40px_-12px_rgba(52,211,153,0.35)]"
            role="region"
            aria-label="Founding member support"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles
                className="h-5 w-5 text-emerald-300"
                strokeWidth={2}
                aria-hidden
              />
              <h2 className="text-base font-semibold tracking-tight text-emerald-50">
                Founding Member Priority Line
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-emerald-100/95">
              As a Beta user, your feedback goes to the front of the queue. Found
              a bug? Send us a screenshot via the chat bubble or email.
            </p>
          </div>
        )}

        <section className="mt-12">
          <div className="flex items-center gap-2">
            <Headset className="h-5 w-5 text-slate-500" aria-hidden />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Knowledge base — Common questions
            </h2>
          </div>
          <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10 bg-[#16181A]/90">
            {accordionItems.map((item) => {
              const isOpen = openId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenId((prev) => (prev === item.id ? null : item.id))
                    }
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.04]"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-medium text-slate-100">
                      {item.title}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-white/5 px-4 pb-4 pt-0">
                      <FaqBody text={item.body} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="mt-10 flex flex-col gap-3 rounded-xl border border-white/10 bg-[#141516]/80 px-5 py-4 text-sm text-slate-400 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <span>Need a tracked request or attachment?</span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link
              href="/dashboard/support"
              className="font-semibold text-[#3395ff] hover:underline"
            >
              Open a support ticket
            </Link>
            <span className="hidden text-slate-600 sm:inline">·</span>
            <Link
              href="/dashboard/help"
              className="font-semibold text-slate-300 hover:text-white hover:underline"
            >
              Search all help articles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
