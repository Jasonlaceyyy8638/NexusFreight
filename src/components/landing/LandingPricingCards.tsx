"use client";

import { useEffect, useState } from "react";

type BetaPayload = {
  foundingSpotsRemaining?: number;
  profileCount?: number;
  betaCap?: number;
};

const BETA_CAP = 5;

/** Public marketing numbers — keep in sync with Stripe prices when you change them. */
const MONTHLY_USD = 125;
const YEARLY_USD = 1250;

export default function LandingPricingCards() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [beta, setBeta] = useState<BetaPayload | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/public/beta-spots", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Partial<BetaPayload>) => {
        if (cancelled) return;
        setBeta({
          foundingSpotsRemaining:
            typeof j.foundingSpotsRemaining === "number"
              ? j.foundingSpotsRemaining
              : Math.max(0, BETA_CAP - (typeof j.profileCount === "number" ? j.profileCount : 0)),
          profileCount: typeof j.profileCount === "number" ? j.profileCount : undefined,
          betaCap: typeof j.betaCap === "number" ? j.betaCap : BETA_CAP,
        });
      })
      .catch(() => {
        if (!cancelled) setBeta({ foundingSpotsRemaining: BETA_CAP, betaCap: BETA_CAP });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const planParam = billing === "yearly" ? "yearly" : "monthly";
  const remaining = beta?.foundingSpotsRemaining ?? BETA_CAP;
  const cap = beta?.betaCap ?? BETA_CAP;
  const betaOpen = remaining > 0;

  async function startCheckout(role: "dispatcher" | "carrier") {
    setCheckoutError(null);
    setCheckoutBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: role, plan: planParam }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      if (!res.ok) {
        setCheckoutError(
          typeof data.error === "string" ? data.error : "Could not start checkout."
        );
        return;
      }
      const url = typeof data.url === "string" ? data.url : null;
      if (!url) {
        setCheckoutError("No checkout URL returned.");
        return;
      }
      window.location.href = url;
    } finally {
      setCheckoutBusy(false);
    }
  }

  return (
    <section
      id="pricing"
      className="scroll-mt-[calc(2.5rem+5.5rem)] border-t border-white/[0.06] px-6 py-20 font-[family-name:var(--font-inter)] sm:py-28"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Pricing
          </p>
          <h2
            id="pricing-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Dispatcher &amp; carrier workspaces
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-400">
            Same platform power. Choose how you bill after your trial.
          </p>

          <div
            className="mx-auto mt-6 inline-flex rounded-lg border border-white/10 bg-[#16181A]/90 p-1"
            role="group"
            aria-label="Billing period"
          >
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                billing === "monthly"
                  ? "bg-[#007bff] text-white shadow-[0_0_16px_rgba(0,123,255,0.35)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                billing === "yearly"
                  ? "bg-[#007bff] text-white shadow-[0_0_16px_rgba(0,123,255,0.35)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Yearly
            </button>
          </div>
          {billing === "yearly" ? (
            <p className="mt-3 text-sm font-medium text-emerald-400/95">
              2 months free on yearly billing
            </p>
          ) : null}
        </div>

        {checkoutError ? (
          <p className="mx-auto mt-6 max-w-lg text-center text-sm text-red-400">
            {checkoutError}
          </p>
        ) : null}

        <div className="mt-14 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <PricingCard
            title="Dispatcher"
            description="Multi-carrier command center: MC roster, loads, settlements, and team permissions."
            betaOpen={betaOpen}
            remaining={remaining}
            cap={cap}
            billing={billing}
            monthlyUsd={MONTHLY_USD}
            yearlyUsd={YEARLY_USD}
            onStart={() => void startCheckout("dispatcher")}
            busy={checkoutBusy}
          />
          <PricingCard
            title="Carrier"
            description="Single-authority fleet: drivers, trucks, ELD map, and carrier-scoped operations."
            betaOpen={betaOpen}
            remaining={remaining}
            cap={cap}
            billing={billing}
            monthlyUsd={MONTHLY_USD}
            yearlyUsd={YEARLY_USD}
            onStart={() => void startCheckout("carrier")}
            busy={checkoutBusy}
          />
        </div>
      </div>
    </section>
  );
}

function PricingCard(props: {
  title: string;
  description: string;
  betaOpen: boolean;
  remaining: number;
  cap: number;
  billing: "monthly" | "yearly";
  monthlyUsd: number;
  yearlyUsd: number;
  onStart: () => void;
  busy: boolean;
}) {
  const {
    title,
    description,
    betaOpen,
    remaining,
    cap,
    billing,
    monthlyUsd,
    yearlyUsd,
    onStart,
    busy,
  } = props;

  const afterTrial =
    billing === "monthly"
      ? `$${monthlyUsd}/mo`
      : `$${yearlyUsd}/yr`;

  const primaryCta = betaOpen ? "Join the Beta" : "Start Trial";
  const ctaText = busy ? "Redirecting…" : primaryCta;

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#16181A] to-[#121416] p-8 shadow-[0_24px_80px_-32px_rgba(0,123,255,0.35)]">
      <h3 className="text-xl font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>

      <div className="mt-6 space-y-3">
        {betaOpen ? (
          <>
            <p className="text-sm font-semibold text-[#3395ff]">
              BETA ACCESS: $0 for 45 Days (Founding Member)
            </p>
            <p className="inline-flex w-fit rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-200">
              Only {remaining} Founding Member spot{remaining === 1 ? "" : "s"} left!
            </p>
          </>
        ) : (
          <p className="text-sm font-semibold text-slate-200">
            7-Day Free Trial — $0 Down
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          After trial
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-white">{afterTrial}</p>
        {billing === "yearly" ? (
          <span className="mt-2 inline-flex rounded-md border border-emerald-500/35 bg-emerald-950/30 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200/95">
            2 Months Free
          </span>
        ) : null}
      </div>

      <div className="mt-8 flex flex-1 flex-col justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={onStart}
          className="inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-[#007bff] px-4 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(0,123,255,0.35)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-90"
        >
          {ctaText}
        </button>
        <p className="mt-3 text-center text-[11px] text-slate-600">
          {betaOpen
            ? `Up to ${cap} founding memberships at this tier.`
            : "Standard trial — no card required at checkout when Stripe allows."}
        </p>
      </div>
    </div>
  );
}
