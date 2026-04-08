"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MarketingNav } from "@/components/landing/MarketingNav";

/**
 * Shown after signup or when proxy requires Stripe Checkout before dashboard.
 * Trial window matches `profiles.trial_ends_at` (45d founding / 7d standard).
 */
export function CompleteSubscriptionClient() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "1";
  const plan = searchParams.get("plan") === "yearly" ? "yearly" : "monthly";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoOnce = useRef(false);

  useEffect(() => {
    autoOnce.current = false;
  }, [plan]);

  const startCheckout = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!res.ok) {
        setError(
          typeof body.error === "string" ? body.error : "Could not start checkout."
        );
        return;
      }
      const url = typeof body.url === "string" ? body.url : null;
      if (!url) {
        setError("No redirect URL from Stripe.");
        return;
      }
      window.location.href = url;
    } finally {
      setBusy(false);
    }
  }, [plan]);

  useEffect(() => {
    if (canceled || autoOnce.current) return;
    autoOnce.current = true;
    void startCheckout();
  }, [canceled, startCheckout]);

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <MarketingNav />
      <main className="mx-auto max-w-lg px-6 pb-24 pt-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Activate your plan
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          One quick step in Stripe: your trial window (45 days for founding
          members, 7 days otherwise) is the same as in our system—usually{" "}
          <strong className="font-medium text-slate-200">nothing due today</strong>{" "}
          and no card required until billing starts, when Stripe allows it.
        </p>
        {canceled ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
            Checkout was canceled. You need to finish this step to use the
            dispatcher dashboard.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void startCheckout()}
            className="rounded-md bg-[#007bff] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(0,123,255,0.25)] hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Opening Stripe…" : "Continue to Stripe Checkout"}
          </button>
          <Link
            href="/"
            className="rounded-md border border-white/15 px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            Home
          </Link>
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          Already have access?{" "}
          <Link href="/auth/login" className="text-[#3395ff] hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
