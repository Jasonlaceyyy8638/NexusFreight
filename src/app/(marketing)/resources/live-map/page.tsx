import type { Metadata } from "next";
import { MarketingPlaceholder } from "@/components/marketing/MarketingPlaceholder";

export const metadata: Metadata = {
  title: "Live Map | NexusFreight",
  description:
    "Mapbox-powered operational map with carrier filters and ELD-ready architecture.",
};

export default function LiveMapResourcePage() {
  return (
    <MarketingPlaceholder
      eyebrow="Resources"
      title="Live Map"
      description="Portfolio-wide or single-carrier focus on a fast Mapbox canvas—built for dispatch, not slides. ELD connections add live positions as you authorize each integration."
    />
  );
}
