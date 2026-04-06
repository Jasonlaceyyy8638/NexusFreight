import type { Metadata } from "next";
import Link from "next/link";
import { FeatureIcon } from "@/components/landing/FeatureIcon";
import { MarketingHalfHero } from "@/components/marketing/MarketingHalfHero";

export const metadata: Metadata = {
  title: "Help Center | NexusFreight",
  description:
    "User guides, carrier setup, driver training, and answers for NexusFreight.",
};

const resourceCards = [
  {
    title: "User Guides",
    body: "Step-by-step workflows for dispatch, settlements, ELD connections, and org administration.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    title: "Carrier Setup",
    body: "MC onboarding, fee schedules, document requirements, and how to connect your fleet telematics.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.25 2.25 0 00-1.227-1.027l-1.09-.272M9.75 18.75h6.75m-6.75 0l-.75-3m6.75 3l.75-3m-6.75 0h-3m3 0h3m-3 0v-3m0 3v3" />
      </svg>
    ),
  },
  {
    title: "Driver Training",
    body: "Dispatch SMS, tracking links, ELD compliance reminders, and mobile-friendly checklists for drivers.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
];

const faqs = [
  {
    q: "How do I invite users to my organization?",
    a: "Admins can invite teammates from Organization settings. Each user receives a role: Admin, Dispatcher, or Driver, with access scoped by Row Level Security.",
  },
  {
    q: "Which ELD providers are supported?",
    a: "NexusFreight integrates with Samsara, Motive, and Geotab-class platforms. See the ELD resources page for how APIs power the map and check-call automation.",
  },
  {
    q: "Where do rate confirmations go?",
    a: "Upload ratecons when creating a load. Files are stored in your private Supabase bucket with encryption at rest—scoped by organization and carrier.",
  },
];

export default function HelpCenterPage() {
  return (
    <>
      <MarketingHalfHero
        eyebrow="Resources"
        title="Help Center"
        description="Documentation templates for your team. For urgent issues, email info@nexusfreight.tech—we monitor around the clock during beta."
      />

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-14 sm:py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {resourceCards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-white/10 bg-[#16181A] p-8 transition-colors duration-300 hover:border-blue-500/50"
            >
              <FeatureIcon>{card.icon}</FeatureIcon>
              <h2 className="text-lg font-bold tracking-tight text-white">
                {card.title}
              </h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-400">
                {card.body}
              </p>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Coming soon
              </p>
            </div>
          ))}
        </div>

        <section
          className="mx-auto mt-20 w-full max-w-6xl"
          aria-labelledby="trust-heading"
        >
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Trust
            </p>
            <h2
              id="trust-heading"
              className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            >
              ELD integrations &amp; security
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400">
              Supabase Row Level Security enforces tenant privacy at the database.
              FMCSA real-time verification aligns carrier identity with the
              federal record at onboarding.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.08] bg-[#16181A] p-10">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                ELD &amp; telematics
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Samsara, Motive, and Geotab APIs for GPS pings and check-call
                automation—scoped per carrier.
              </p>
              <p className="mt-6">
                <Link
                  href="/resources/eld-integrations"
                  className="text-sm font-semibold text-slate-400 transition-colors hover:text-blue-500"
                >
                  ELD integrations →
                </Link>
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#16181A] p-10">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Privacy architecture
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                RLS on every row; AES-256 at rest for ratecon storage in Supabase.
              </p>
              <p className="mt-6">
                <Link
                  href="/resources/security"
                  className="text-sm font-semibold text-slate-400 transition-colors hover:text-blue-500"
                >
                  Security &amp; RLS →
                </Link>
              </p>
            </div>
          </div>
          <p className="mt-10 text-center">
            <Link
              href="/company/compliance"
              className="text-sm font-semibold text-slate-400 transition-colors hover:text-blue-500"
            >
              FMCSA compliance overview →
            </Link>
          </p>
        </section>

        <section
          className="mx-auto mt-20 w-full max-w-3xl"
          aria-labelledby="faq-heading"
        >
          <h2
            id="faq-heading"
            className="text-center text-2xl font-bold tracking-tight text-white"
          >
            Frequently asked questions
          </h2>
          <ul className="mt-10 space-y-3">
            {faqs.map((item) => (
              <li
                key={item.q}
                className="rounded-xl border border-white/10 bg-[#16181A]/80 px-6 py-5 backdrop-blur-sm"
              >
                <p className="font-semibold text-slate-200">{item.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {item.a}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mx-auto mt-16 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-400 transition-colors hover:text-blue-500"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </>
  );
}
