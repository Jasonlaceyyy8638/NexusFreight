import type { Metadata } from "next";
import { Suspense } from "react";
import { DriverSetPasswordClient } from "./DriverSetPasswordClient";

export const metadata: Metadata = {
  title: "Create password | NexusFreight",
  robots: { index: false, follow: false },
};

export default function DriverSetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0E10] pt-24 text-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <DriverSetPasswordClient />
    </Suspense>
  );
}
