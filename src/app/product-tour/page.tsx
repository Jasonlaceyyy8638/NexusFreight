"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarketingPageBackdrop } from "@/components/landing/MarketingPageBackdrop";
import { MarketingSiteHeader } from "@/components/marketing/MarketingSiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";

export default function ProductTourPage() {
  const router = useRouter();

  /**
   * Middleware sets `nexus_demo_mode`. Carrier suite → cookie `carrier`, which the
   * dashboard treats as `userRole: "carrier"` and Fleet Command UI immediately.
   */
  const enterDemo = (suite: "dispatcher" | "carrier") => {
    router.push(`/dashboard?demo=${suite}`);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#1A1C1E] font-sans text-white">
      <MarketingPageBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <MarketingSiteHeader scrollDriven={false} />
        <main className="flex flex-1 flex-col px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Interactive preview
            </p>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Choose your suite
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-400">
              Explore NexusFreight with live sample data—no login required. Pick
              the experience that matches how you operate.
            </p>
          </div>

          <div className="mx-auto mt-16 grid w-full max-w-5xl gap-8 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => enterDemo("dispatcher")}
              className="group flex flex-col rounded-2xl border border-white/[0.1] bg-gradient-to-b from-[#16181A] to-[#121416] p-10 text-left shadow-[0_24px_80px_-32px_rgba(0,123,255,0.35)] transition-all duration-300 hover:border-[#007bff]/45 hover:shadow-[0_28px_90px_-28px_rgba(0,123,255,0.45)]"
            >
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#3395ff]">
                Portfolio
              </span>
              <span className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Explore Dispatcher Suite
              </span>
              <span className="mt-3 text-sm leading-relaxed text-slate-400">
                Multi-carrier command center: settlements, FMCSA-style MC
                roster, fifteen sample loads, and five trucks across Chicago,
                Dallas, Atlanta, and more.
              </span>
              <span className="mt-8 inline-flex items-center text-sm font-bold text-[#007bff] transition-colors group-hover:text-[#3395ff]">
                Launch sandbox →
              </span>
            </button>

            <button
              type="button"
              onClick={() => enterDemo("carrier")}
              className="group flex flex-col rounded-2xl border border-white/[0.1] bg-gradient-to-b from-[#16181A] to-[#121416] p-10 text-left shadow-[0_24px_80px_-32px_rgba(16,185,129,0.2)] transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_28px_90px_-28px_rgba(16,185,129,0.25)]"
            >
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400/90">
                Single fleet
              </span>
              <span className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Explore Carrier Suite
              </span>
              <span className="mt-3 text-sm leading-relaxed text-slate-400">
                Private fleet view: one authority, twelve loads, drivers with
                MC/DOT context, and trucks pinned to major freight hubs.
              </span>
              <span className="mt-8 inline-flex items-center text-sm font-bold text-emerald-400 transition-colors group-hover:text-emerald-300">
                Launch sandbox →
              </span>
            </button>
          </div>

          <p className="mx-auto mt-14 max-w-lg text-center text-xs text-slate-500">
            Demo mode uses read-only sample data. Saving loads or changing roster
            requires a free account.{" "}
            <Link
              href="/auth/signup"
              className="text-slate-400 underline decoration-white/15 underline-offset-2 transition-colors hover:text-blue-500"
            >
              Sign up to go live
            </Link>
            .
          </p>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
