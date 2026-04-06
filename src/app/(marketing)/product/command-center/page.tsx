import type { Metadata } from "next";
import { MarketingPlaceholder } from "@/components/marketing/MarketingPlaceholder";

export const metadata: Metadata = {
  title: "Command Center | NexusFreight",
  description:
    "Multi-carrier portfolio workspace—loads, fleet, and revenue in one system of record.",
};

export default function CommandCenterProductPage() {
  return (
    <MarketingPlaceholder
      eyebrow="Product"
      title="Command Center"
      description="One master workspace for every MC you manage. Portfolio filters, org-scoped data, and operational clarity without spreadsheet drift."
    />
  );
}
