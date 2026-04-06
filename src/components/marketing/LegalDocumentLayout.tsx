import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { MarketingPageBackdrop } from "@/components/landing/MarketingPageBackdrop";
import { SiteFooter } from "@/components/landing/SiteFooter";

type Props = {
  children: ReactNode;
};

/**
 * Marketing legal pages: same dark shell as the landing site (nav + footer),
 * centered prose with light grey body copy on dark background.
 */
export function LegalDocumentLayout({ children }: Props) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#0D0E10] text-white">
      <MarketingPageBackdrop />

      <div className="relative z-10 flex min-h-screen flex-col">
        <MarketingNav />

        <main className="flex flex-1 flex-col px-6 py-10 sm:py-14">
          <div className="mx-auto w-full max-w-4xl flex-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-[#3B82F6]"
            >
              <span aria-hidden>←</span>
              Back to Home
            </Link>

            <article className="mt-8 rounded-xl border border-white/10 bg-[#0D0E10]/90 p-8 font-[family-name:var(--font-inter)] sm:p-10">
              <div className="text-slate-300 [&_a]:text-slate-200 [&_a]:underline [&_a]:decoration-white/20 [&_a]:underline-offset-4 [&_a]:transition-colors hover:[&_a]:text-[#3B82F6] hover:[&_a]:decoration-[#3B82F6]/40">
                {children}
              </div>
            </article>
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
