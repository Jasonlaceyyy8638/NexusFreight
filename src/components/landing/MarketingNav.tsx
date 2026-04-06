"use client";

import { MarketingSiteHeader } from "@/components/marketing/MarketingSiteHeader";

/** Marketing header for the home page (hero) — translucent bar, not scroll-driven. */
export function MarketingNav() {
  return <MarketingSiteHeader scrollDriven={false} />;
}
