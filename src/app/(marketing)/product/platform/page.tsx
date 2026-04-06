import type { Metadata } from "next";
import { MarketingPlaceholder } from "@/components/marketing/MarketingPlaceholder";

export const metadata: Metadata = {
  title: "Platform | NexusFreight",
  description:
    "Dispatch agency and in-house fleet paths—sign up and choose the experience that matches your operation.",
};

export default function PlatformProductPage() {
  return (
    <MarketingPlaceholder
      eyebrow="Product"
      title="Platform"
      description="Service-provider agencies and verified fleets each get a tailored surface: portfolio command center or single-tenant fleet operations—with the same security backbone."
    />
  );
}
