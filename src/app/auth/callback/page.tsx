import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCallbackClient } from "./AuthCallbackClient";

export const metadata: Metadata = {
  title: "Signing in | NexusFreight",
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center bg-[#0D0E10] px-4 text-center text-sm text-slate-500">
          Signing you in…
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
