import type { Metadata } from "next";
import { Suspense } from "react";
import { CompleteSubscriptionClient } from "./CompleteSubscriptionClient";

export const metadata: Metadata = {
  title: "Activate subscription | NexusFreight",
  description:
    "Complete Stripe Checkout to activate your plan. No charge during trial when applicable.",
};

export default function CompleteSubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0E10] pt-24 text-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <CompleteSubscriptionClient />
    </Suspense>
  );
}
