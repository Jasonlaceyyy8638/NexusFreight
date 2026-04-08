"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { createClient } from "@/lib/supabase/client";

const POLL_MS = 1000;
const MAX_POLLS = 25;

export function ProvisioningClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<"working" | "timeout" | "error">("working");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setErrorMessage("Configuration error. Please try again later.");
      setPhase("error");
      return;
    }

    let cancelled = false;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/auth/login");
        return;
      }

      for (let i = 0; i < MAX_POLLS; i++) {
        if (cancelled) return;
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("org_id, stripe_subscription_id")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          setErrorMessage(error.message || "Could not load your profile.");
          setPhase("error");
          return;
        }

        if (profile?.org_id?.trim()) {
          router.replace("/dashboard");
          return;
        }

        if (!profile?.stripe_subscription_id?.trim()) {
          router.replace("/auth/complete-subscription");
          return;
        }

        await new Promise((r) => setTimeout(r, POLL_MS));
      }

      if (!cancelled) setPhase("timeout");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <MarketingNav />
      <main className="mx-auto max-w-lg px-6 pb-24 pt-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Setting up your workspace
        </h1>
        {phase === "working" ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Your subscription is active. We’re finishing a few things on our
            side—this usually takes just a few seconds.
          </p>
        ) : null}
        {phase === "timeout" ? (
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-400">
            <p>
              This is taking longer than expected. Your payment went through;
              your workspace may still be finishing setup.
            </p>
            <p>
              Please contact{" "}
              <a
                href="mailto:info@nexusfreight.tech"
                className="font-medium text-sky-400 underline-offset-2 hover:underline"
              >
                info@nexusfreight.tech
              </a>{" "}
              or try{" "}
              <Link
                href="/dashboard"
                className="font-medium text-sky-400 underline-offset-2 hover:underline"
              >
                opening the dashboard
              </Link>{" "}
              again in a minute.
            </p>
          </div>
        ) : null}
        {phase === "error" && errorMessage ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {phase === "working" ? (
          <div
            className="mt-8 flex justify-center"
            aria-hidden
          >
            <span className="inline-block size-8 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
          </div>
        ) : null}
      </main>
    </div>
  );
}
