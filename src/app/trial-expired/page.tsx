"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Database, Lock, Sparkles } from "lucide-react";
import { MarketingPageBackdrop } from "@/components/landing/MarketingPageBackdrop";
import { NexusFreightLogo } from "@/components/marketing/NexusFreightLogo";

/**
 * Shown when trial/subscription access is revoked (proxy → here).
 * Must stay reachable while `stripe_subscription_status` is canceled / unpaid
 * so users can resume without a redirect loop (see src/proxy.ts).
 */
export default function TrialExpiredPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("plan");
    if (p === "yearly") setPlan("yearly");
  }, []);

  const startCheckout = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof body.error === "string"
            ? body.error
            : "Could not start checkout."
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
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0D0E10] text-white">
      <MarketingPageBackdrop />

      <div className="relative z-10 flex flex-1 flex-col px-6 py-12 sm:py-16">
        <div className="mx-auto mb-10 flex w-full max-w-md justify-center sm:mb-12">
          <Link
            href="/"
            className="rounded-xl outline-none ring-offset-2 ring-offset-[#0D0E10] transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50"
          >
            <NexusFreightLogo className="h-9 w-auto sm:h-10" />
          </Link>
        </div>

        <div className="mx-auto w-full max-w-lg">
          <div
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#1A1C1E]/95 to-[#121416]/98 p-8 shadow-[0_24px_80px_-32px_rgba(0,123,255,0.25)] backdrop-blur-sm sm:p-10"
            role="region"
            aria-labelledby="trial-expired-heading"
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#007bff]/15 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl"
              aria-hidden
            />

            <div className="relative">
              <div className="flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/95">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Access paused
                </span>
              </div>

              <h1
                id="trial-expired-heading"
                className="mt-6 text-center text-2xl font-semibold leading-tight tracking-tight text-white sm:text-[1.65rem]"
              >
                Your trial has ended
              </h1>

              <p className="mt-5 text-center text-base leading-relaxed text-slate-400 sm:text-[1.05rem]">
                Your data is safe, but you must subscribe to continue using
                NexusFreight.
              </p>

              <ul className="mt-8 space-y-3 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <Database className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="pt-1 leading-snug">
                    <span className="font-semibold text-slate-200">
                      Nothing was deleted.
                    </span>{" "}
                    Orgs, loads, and settings stay in place until you subscribe
                    again.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#007bff]/15 text-[#3395ff]">
                    <Lock className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="pt-1 leading-snug">
                    Secure checkout with Stripe. Same account email you use to
                    sign in.
                  </span>
                </li>
              </ul>

              {error ? (
                <p
                  className="mt-6 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-center text-sm text-red-200"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                disabled={busy}
                onClick={() => void startCheckout()}
                className="mt-8 flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#007bff] px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_32px_rgba(0,123,255,0.35)] transition-[opacity,transform] hover:opacity-95 active:scale-[0.99] disabled:cursor-wait disabled:opacity-90"
              >
                {busy
                  ? "Opening checkout…"
                  : plan === "yearly"
                    ? "Resume subscription — $1,250/yr"
                    : "Resume subscription — $125/mo"}
              </button>

              {plan === "monthly" ? (
                <p className="mt-4 text-center text-xs text-slate-500">
                  Prefer yearly billing?{" "}
                  <button
                    type="button"
                    className="font-medium text-[#3395ff] underline decoration-[#3395ff]/30 underline-offset-2 hover:decoration-[#3395ff]"
                    onClick={() => setPlan("yearly")}
                  >
                    Switch to yearly
                  </button>
                </p>
              ) : (
                <p className="mt-4 text-center text-xs text-slate-500">
                  <button
                    type="button"
                    className="font-medium text-[#3395ff] underline decoration-[#3395ff]/30 underline-offset-2 hover:decoration-[#3395ff]"
                    onClick={() => setPlan("monthly")}
                  >
                    Use monthly ($125/mo)
                  </button>
                </p>
              )}

              <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-600">
                Questions?{" "}
                <a
                  href="mailto:info@nexusfreight.tech"
                  className="text-slate-400 underline decoration-white/10 underline-offset-2 transition-colors hover:text-white"
                >
                  info@nexusfreight.tech
                </a>
              </p>
            </div>
          </div>

          <p className="mt-10 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              ← Back to site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
