"use client";

import { useEffect, useState } from "react";

/**
 * Temporary dev-only UI — POSTs to `/api/stripe/checkout` with
 * `x-nexus-test-onboarding: 1` so the handler creates a Stripe-first session
 * (same metadata as “Join the Beta”) using `resolveStripePriceId(plan)`.
 */
export function TestOnboardingClient() {
  const [busy, setBusy] = useState<"dispatcher" | "carrier" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const w = window as unknown as { $crisp?: unknown[][] };
    const hide = () => {
      if (Array.isArray(w.$crisp)) w.$crisp.push(["do", "chat:hide"]);
    };
    hide();
    const t = window.setTimeout(hide, 500);
    return () => {
      window.clearTimeout(t);
      if (Array.isArray(w.$crisp)) w.$crisp.push(["do", "chat:show"]);
    };
  }, []);

  async function start(role: "dispatcher" | "carrier") {
    setError(null);
    setBusy(role);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-nexus-test-onboarding": "1",
        },
        body: JSON.stringify({ plan: "monthly", testRole: role }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Checkout failed."
        );
        return;
      }
      const url = typeof data.url === "string" ? data.url : null;
      if (!url) {
        setError("No Checkout URL returned.");
        return;
      }
      window.location.href = url;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0E10] px-6 py-16 text-white">
      <div className="mx-auto max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
          Development only
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Test onboarding
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Starts Stripe Checkout via{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
            POST /api/stripe/checkout
          </code>{" "}
          (header{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
            x-nexus-test-onboarding: 1
          </code>
          ) with monthly price ID and dispatcher/carrier metadata.           Success URL uses{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
            STRIPE_CHECKOUT_SITE_BASE
          </code>{" "}
          if set, else{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_SITE_URL
          </code>
          , then{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
            /auth/signup?session_id=&#123;CHECKOUT_SESSION_ID&#125;
          </code>
          .
        </p>

        {error ? (
          <p className="mt-6 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="relative z-[1000001] mt-10 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={busy === "dispatcher"}
            onClick={() => void start("dispatcher")}
            className="flex-1 rounded-xl bg-[#007bff] px-5 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(0,123,255,0.35)] hover:opacity-95 disabled:opacity-50"
          >
            {busy === "dispatcher" ? "Opening…" : "Test Dispatcher Signup"}
          </button>
          <button
            type="button"
            disabled={busy === "carrier"}
            onClick={() => void start("carrier")}
            className="flex-1 rounded-xl border border-white/20 bg-white/5 px-5 py-3.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
          >
            {busy === "carrier" ? "Opening…" : "Test Carrier Signup"}
          </button>
        </div>
      </div>
    </div>
  );
}
