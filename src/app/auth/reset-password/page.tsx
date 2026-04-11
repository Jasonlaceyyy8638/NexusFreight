import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordClient } from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Set new password | NexusFreight",
  description: "Choose a new password for your NexusFreight account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0E10] pt-24 text-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
