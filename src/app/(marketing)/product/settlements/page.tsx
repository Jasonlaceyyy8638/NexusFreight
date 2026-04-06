import type { Metadata } from "next";
import { MarketingPlaceholder } from "@/components/marketing/MarketingPlaceholder";

export const metadata: Metadata = {
  title: "Settlements | NexusFreight",
  description:
    "Carrier-scoped settlement PDFs from delivered activity and fee schedules.",
};

export default function SettlementsProductPage() {
  return (
    <MarketingPlaceholder
      eyebrow="Product"
      title="Settlements"
      description="Generate professional weekly statements, attach fee logic automatically, and email PDFs to the billing inbox on file."
    />
  );
}
