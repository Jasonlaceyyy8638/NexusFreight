import type { Metadata } from "next";
import { MarketingPlaceholder } from "@/components/marketing/MarketingPlaceholder";

export const metadata: Metadata = {
  title: "Dispatch | NexusFreight",
  description:
    "Driver notifications, tracking links, and disciplined load status from draft to delivered.",
};

export default function DispatchProductPage() {
  return (
    <MarketingPlaceholder
      eyebrow="Product"
      title="Dispatch"
      description="Structured handoffs to the cab: lanes, rates, and assignments stay attached when you dispatch—fewer check calls, clearer accountability."
    />
  );
}
