import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordClient } from "./ForgotPasswordClient";

export const metadata: Metadata = {
  title: "Reset password | NexusFreight",
  description: "Request a link to reset your NexusFreight account password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0E10] pt-24 text-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <ForgotPasswordClient />
    </Suspense>
  );
}
