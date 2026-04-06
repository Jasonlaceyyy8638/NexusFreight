import type { Metadata } from "next";
import { MarketingPlaceholder } from "@/components/marketing/MarketingPlaceholder";

export const metadata: Metadata = {
  title: "About | NexusFreight",
  description:
    "NexusFreight builds the unified operating system for modern logistics.",
};

export default function AboutCompanyPage() {
  return (
    <MarketingPlaceholder
      eyebrow="Company"
      title="About NexusFreight"
      description="We build software for dispatch agencies and fleets that cannot afford operational ambiguity—loads, assets, settlements, and verification in one disciplined surface."
    />
  );
}
