"use client";

import type { ReactNode } from "react";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { MarketingSiteHeader } from "@/components/marketing/MarketingSiteHeader";

export function MarketingLayoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#1A1C1E] font-sans text-white antialiased">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(0,123,255,0.08),transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <MarketingSiteHeader scrollDriven />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
