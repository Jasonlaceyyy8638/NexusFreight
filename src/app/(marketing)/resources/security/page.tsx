import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHalfHero } from "@/components/marketing/MarketingHalfHero";

export const metadata: Metadata = {
  title: "Security & RLS | NexusFreight",
  description:
    "Supabase Row Level Security and encrypted rate confirmation storage for corporate-grade trust.",
};

export default function SecurityResourcePage() {
  return (
    <>
      <MarketingHalfHero
        eyebrow="Resources"
        title="Security built for corporate logistics"
        description="Tenant isolation is not a feature flag—it is enforced where data lives. NexusFreight pairs Supabase Row Level Security with encrypted document storage so sensitive commercial files stay private."
      />
      <div className="mx-auto max-w-3xl flex-1 px-6 py-12 sm:py-14">
        <div className="space-y-10 text-base leading-relaxed text-slate-400">
          <section>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Supabase Row Level Security (RLS)
            </h2>
            <p className="mt-4">
              Every application query runs as an authenticated user tied to an
              organization.{" "}
              <strong className="font-medium text-slate-200">
                PostgreSQL RLS policies
              </strong>{" "}
              enforce that rows are visible or writable only when they belong to
              that org. There is no &ldquo;accidentally list every carrier in the
              database&rdquo; path: the database itself rejects cross-tenant
              access, which is the bar enterprise IT and legal teams expect.
            </p>
            <p className="mt-4">
              Profiles, loads, drivers, trucks, settlement inputs, and metadata
              all flow through the same org boundary—consistent for dispatch
              agencies managing dozens of MCs and for single-fleet operators
              alike.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Rate confirmation storage &amp; AES-256
            </h2>
            <p className="mt-4">
              Rate confirmations (ratecons) are stored in{" "}
              <strong className="font-medium text-slate-200">
                Supabase Storage
              </strong>{" "}
              buckets scoped to your project. Objects are protected with{" "}
              <strong className="font-medium text-slate-200">
                AES-256 encryption at rest
              </strong>{" "}
              on the underlying cloud object store—aligned with how regulated
              enterprises expect commercial PDFs and contracts to be handled.
              Access is mediated through your app with signed URLs and org-aware
              paths, not public directories.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Why this matters for trust
            </h2>
            <p className="mt-4">
              Brokers and carriers share commercially sensitive documents every
              day. NexusFreight is designed so those artifacts remain inside the
              tenant that uploaded them, with encryption and RLS as dual
              layers—not optional hardening after the fact.
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
