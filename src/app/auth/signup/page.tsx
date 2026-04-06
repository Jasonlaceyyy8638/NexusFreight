import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupClient } from "./SignupClient";

export const metadata: Metadata = {
  title: "Sign up | NexusFreight",
  description: "Create a dispatcher or carrier account with FMCSA-backed verification.",
};

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0E10] pt-24 text-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <SignupClient />
    </Suspense>
  );
}
