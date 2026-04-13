"use client";

import { MarketPulse } from "@/components/dashboard/MarketPulse";

/**
 * Full-width Market Pulse for the marketing home page (live `market_rates` via anon Supabase).
 */
export function LandingMarketPulseSection() {
  return (
    <section
      id="market-pulse"
      className="border-t border-white/[0.06] bg-zinc-950 px-6 py-16 sm:py-20"
      aria-label="Market Pulse — national spot benchmarks"
    >
      <div className="mx-auto max-w-6xl">
        <MarketPulse />
      </div>
    </section>
  );
}
