import Link from "next/link";
import { Shield } from "lucide-react";

/** Full-width trust strip: glowing shield + enterprise security copy. */
export function SecurityDataTrustSection() {
  return (
    <section
      className="w-full border-t border-white/[0.06] bg-[#1A1C1E] px-6 py-16 font-[family-name:var(--font-inter)] sm:py-20 md:py-24"
      aria-labelledby="security-data-trust-heading"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-14 lg:gap-20">
        <div className="flex justify-center md:justify-start">
          <div className="relative flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
            <span
              className="absolute inset-[-20%] rounded-full bg-[#3B82F6]/35 blur-[56px]"
              aria-hidden
            />
            <span
              className="absolute inset-[10%] rounded-full bg-[#3B82F6]/20 blur-2xl"
              aria-hidden
            />
            <div className="relative flex h-full w-full items-center justify-center rounded-3xl border border-[#3B82F6]/30 bg-[#3B82F6]/10 shadow-[0_0_60px_-12px_rgba(59,130,246,0.65)]">
              <Shield
                className="h-[7rem] w-[7rem] text-[#3B82F6] drop-shadow-[0_0_28px_rgba(59,130,246,0.85)] sm:h-[8rem] sm:w-[8rem]"
                strokeWidth={1.15}
                aria-hidden
              />
            </div>
          </div>
        </div>

        <div className="text-center md:text-left">
          <h2
            id="security-data-trust-heading"
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Enterprise-Grade Security for Every Fleet.
          </h2>
          <p className="mt-4 text-lg font-medium leading-relaxed text-slate-300 sm:text-xl">
            Your data is your business. We keep it that way.
          </p>
          <p className="mt-6 text-base leading-relaxed text-slate-400 sm:text-lg">
            NexusFreight is built on a foundation of industrial-strength
            security. From OAuth 2.0 encrypted handshakes with your ELD provider
            to Supabase Row-Level Security (RLS), we ensure that your GPS data,
            settlements, and driver files are strictly siloed and never shared
            with third parties.
          </p>
          <div className="mt-8">
            <Link
              href="/privacy"
              className="inline-flex items-center text-sm font-semibold text-[#3B82F6] transition-colors hover:text-[#60A5FA]"
            >
              Review our Data Processing Agreement
              <span className="ml-1.5" aria-hidden>
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
