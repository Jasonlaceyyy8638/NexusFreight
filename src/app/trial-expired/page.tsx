"use client";

import Link from "next/link";
import { useState } from "react";

export default function TrialExpiredPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
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
    <div className="min-h-screen bg-[#0D0E10] px-6 py-16 text-white">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
          Trial ended
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Continue with NexusFreight
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Your free trial has ended. Subscribe for $125/month to keep full access
          to your command center, loads, fleet, and settlements.
        </p>
        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void startCheckout()}
          className="mt-8 w-full rounded-md bg-[#007bff] px-6 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(0,123,255,0.35)] hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Redirecting to Stripe…" : "Subscribe — $125/mo"}
        </button>
        <p className="mt-4 text-xs text-slate-600">
          Secure checkout powered by Stripe. Cancel anytime from the customer
          portal (coming soon) or contact{" "}
          <a
            href="mailto:info@nexusfreight.tech"
            className="text-slate-400 underline hover:text-white"
          >
            info@nexusfreight.tech
          </a>
          .
        </p>
        <Link
          href="/"
          className="mt-10 inline-block text-sm font-medium text-[#3395ff] hover:underline"
        >
          ← Back to site
        </Link>
      </div>
    </div>
  );
}
