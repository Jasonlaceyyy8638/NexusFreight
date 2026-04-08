"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Building2,
  ClipboardList,
  Shield,
  Sparkles,
  Truck,
} from "lucide-react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { FOUNDING_MEMBER_CAP } from "@/lib/beta/founding-cap";

function trialDayOfSeven(trialEndsAtIso: string | null): number {
  if (!trialEndsAtIso) return 1;
  const end = new Date(trialEndsAtIso).getTime();
  if (Number.isNaN(end)) return 1;
  const start = end - 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const raw =
    Math.floor((now - start) / (24 * 60 * 60 * 1000)) + 1;
  return Math.min(7, Math.max(1, raw));
}

export function DashboardWelcomeClient() {
  const router = useRouter();
  const {
    isBetaUser,
    interactiveDemo,
    usingDemo,
    currentProfileId,
    orgId,
    isCarrierOrg,
    trialType,
    trialEndsAt,
    hasStripeSubscription,
  } = useDashboardData();

  const profileReady =
    !usingDemo && !interactiveDemo && currentProfileId != null && orgId != null;

  const showTrialWelcome =
    profileReady &&
    !isBetaUser &&
    trialType === "TRIAL" &&
    trialEndsAt != null &&
    !hasStripeSubscription;

  useEffect(() => {
    if (!profileReady) return;
    if (isBetaUser || showTrialWelcome) return;
    router.replace("/dashboard");
  }, [profileReady, isBetaUser, showTrialWelcome, router]);

  if (interactiveDemo || usingDemo) {
    return (
      <div className="px-6 py-16 text-center text-sm text-slate-500">
        Welcome is available when you sign in with a founding member account.
        <div className="mt-4">
          <Link href="/dashboard" className="text-[#3395ff] hover:underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!profileReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!isBetaUser && !showTrialWelcome) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6 text-sm text-slate-500">
        Redirecting…
      </div>
    );
  }

  if (showTrialWelcome) {
    const day = trialDayOfSeven(trialEndsAt);
    const progressPct = (day / 7) * 100;

    return (
      <div className="mx-auto max-w-2xl px-6 py-12 md:py-16">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-white md:text-3xl">
          Welcome to NexusFreight!
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed text-slate-400 md:text-lg">
          Your 7-day trial of the Dispatcher Pro plan is active. No credit card
          required.
        </p>

        <div className="mx-auto mt-8 max-w-md">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Trial progress</span>
            <span className="tabular-nums text-slate-400">
              Day {day} of 7
            </span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={day}
            aria-valuemin={1}
            aria-valuemax={7}
            aria-label={`Trial day ${day} of 7`}
          >
            <div
              className="h-full rounded-full bg-[#007bff] transition-[width] duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center">
          <Link
            href="/dashboard/loads"
            className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-[#007bff] px-8 py-4 text-center text-base font-semibold text-white shadow-[0_12px_40px_-12px_rgba(0,123,255,0.55)] transition-colors hover:bg-[#0066dd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3395ff]"
          >
            <Truck className="h-5 w-5 shrink-0" aria-hidden />
            Dispatch Your First Load
          </Link>
        </div>

        <p className="mt-10 text-center">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            Skip to command center →
          </Link>
        </p>
      </div>
    );
  }

  const carriersHref = isCarrierOrg ? "/dashboard/fleet" : "/dashboard/carriers";
  const loadsHref = "/dashboard/loads";
  const shieldHref = "/#nexusfreight-shield";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 md:py-16">
      <div className="mb-2 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-200/95">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Founding member
        </span>
      </div>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-white md:text-3xl">
        Welcome to the Inner Circle, Founding Member!
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed text-slate-400 md:text-lg">
        You&apos;ve secured 1 of only {FOUNDING_MEMBER_CAP} Beta spots. Your 45-day premium access
        is now active.
      </p>

      <div className="mt-10 rounded-xl border border-white/10 bg-[#16181A]/90 p-6 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.5)]">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Next steps
        </h2>
        <ol className="mt-5 space-y-5 text-sm leading-relaxed text-slate-300">
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#007bff]/15 text-xs font-bold text-[#5aa9ff]">
              1
            </span>
            <div>
              <p className="font-medium text-white">
                Add your first Carrier
              </p>
              <p className="mt-1 text-slate-400">
                Use the FMCSA search to vet your fleet.
              </p>
              <Link
                href={carriersHref}
                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#3395ff] hover:underline"
              >
                <Building2 className="h-4 w-4 shrink-0" aria-hidden />
                Open {isCarrierOrg ? "fleet workspace" : "Carriers"}
              </Link>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#007bff]/15 text-xs font-bold text-[#5aa9ff]">
              2
            </span>
            <div>
              <p className="font-medium text-white">Create a Load</p>
              <p className="mt-1 text-slate-400">
                Experience the automated driver alert system.
              </p>
              <Link
                href={loadsHref}
                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#3395ff] hover:underline"
              >
                <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
                Open Loads
              </Link>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#007bff]/15 text-xs font-bold text-[#5aa9ff]">
              3
            </span>
            <div>
              <p className="font-medium text-white">Check Compliance</p>
              <p className="mt-1 text-slate-400">
                See the NexusFreight Shield in action.
              </p>
              <a
                href={shieldHref}
                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#3395ff] hover:underline"
              >
                <Shield className="h-4 w-4 shrink-0" aria-hidden />
                Read about NexusFreight Shield
              </a>
            </div>
          </li>
        </ol>
      </div>

      <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-5 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
          Beta support
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-100/90">
          Spotted a bug? 📸 Screenshot it and send to{" "}
          <a
            href="mailto:info@nexusfreight.tech?subject=NexusFreight%20beta%20feedback"
            className="font-semibold text-emerald-200 underline decoration-emerald-500/40 underline-offset-2 hover:text-white"
          >
            info@nexusfreight.tech
          </a>
          . We&apos;re building this for you, so your feedback is our roadmap.
        </p>
      </div>

      <p className="mt-10 text-center">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
        >
          Skip to command center →
        </Link>
      </p>
    </div>
  );
}
