"use client";

import Link from "next/link";
import type { InteractiveDemoVariant } from "@/lib/demo_data";

export function InteractiveDemoBanner({
  variant,
}: {
  /** From server `demoSession` — avoids client-only context drift during hydration. */
  variant: InteractiveDemoVariant;
}) {
  const label = variant === "carrier" ? "Carrier" : "Dispatcher";

  return (
    <div className="sticky top-10 z-[45] border-b border-[#007bff]/25 bg-[#0a1628]/95 backdrop-blur-md">
      <div className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <p className="text-center text-[11px] font-semibold leading-snug text-slate-200 sm:text-left sm:text-xs">
          <span className="rounded border border-[#007bff]/40 bg-[#007bff]/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#3395ff]">
            Demo mode
          </span>{" "}
          <span className="text-slate-300">
            You&apos;re exploring the full NexusFreight{" "}
            <span className="text-white">{label}</span> command center—no
            feature limits in this preview.
          </span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
          <Link
            href="/auth/signup"
            className="rounded-md bg-[#007bff] px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_0_16px_rgba(0,123,255,0.3)] transition-opacity hover:opacity-90 sm:text-xs"
          >
            Create account
          </Link>
          <Link
            href="/api/demo/exit"
            className="text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-300 sm:text-xs"
          >
            Exit demo
          </Link>
        </div>
      </div>
    </div>
  );
}
