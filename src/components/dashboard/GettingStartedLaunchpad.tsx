"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Check, Loader2, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { burstLaunchpadConfetti } from "@/lib/onboarding/confetti-burst";
import { createClient } from "@/lib/supabase/client";
import {
  mergeUserOnboardingWithWorkspace,
  setUserOnboardingPacketReady,
  type UserOnboardingFlags,
} from "@/lib/user-onboarding/sync";

function progressPct(flags: UserOnboardingFlags): number {
  const n = [
    flags.profile_done,
    flags.carrier_added,
    flags.doc_uploaded,
    flags.packet_ready,
  ].filter(Boolean).length;
  return Math.round((n / 4) * 100);
}

export function GettingStartedLaunchpad() {
  const {
    supabase: ctxSupabase,
    orgId,
    authSessionUserId,
    carriers,
    refresh,
    usingDemo,
    interactiveDemo,
    isCarrierOrg,
    profileRole,
  } = useDashboardData();

  const supabase = ctxSupabase ?? createClient();
  const userId = authSessionUserId;
  const firstCarrierId = carriers[0]?.id ?? null;

  const [flags, setFlags] = useState<UserOnboardingFlags>(() => ({
    profile_done: false,
    carrier_added: false,
    doc_uploaded: false,
    packet_ready: false,
  }));
  const [displayName, setDisplayName] = useState<string>("");
  const [packetBusy, setPacketBusy] = useState(false);

  const canRun =
    Boolean(supabase && userId && orgId) &&
    !usingDemo &&
    !interactiveDemo &&
    !isCarrierOrg &&
    profileRole !== "Driver";

  const sync = useCallback(async () => {
    if (!supabase || !userId || !orgId) return;
    const next = await mergeUserOnboardingWithWorkspace(supabase, userId, orgId);
    setFlags(next);
  }, [supabase, userId, orgId]);

  useEffect(() => {
    if (!canRun) return;
    void sync();
  }, [canRun, sync, carriers.length]);

  useEffect(() => {
    if (!canRun) return;
    const onVis = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [canRun, sync]);

  useEffect(() => {
    if (!canRun || !supabase || !userId) return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const n = (data as { full_name?: string | null } | null)?.full_name?.trim();
        setDisplayName(n && n.length ? n : "there");
      });
    return () => {
      cancelled = true;
    };
  }, [canRun, supabase, userId]);

  const onDummyBrokerPacket = async () => {
    if (!supabase || !userId || !orgId) {
      toast.error("Sign in to generate a sample packet.");
      return;
    }
    setPacketBusy(true);
    try {
      const res = await fetch("/api/onboarding/dummy-broker-packet", {
        credentials: "include",
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "NexusFreight-Broker-Packet-Sample.pdf";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2500);

      const wasReady = flags.packet_ready;
      await setUserOnboardingPacketReady(supabase, userId, orgId);
      if (!wasReady) {
        toast.success("Compliance Level: Pro");
        void burstLaunchpadConfetti();
      }
      await refresh();
      await sync();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not generate sample packet."
      );
    } finally {
      setPacketBusy(false);
    }
  };

  if (!canRun) return null;

  const pct = progressPct(flags);
  const allDone =
    flags.profile_done &&
    flags.carrier_added &&
    flags.doc_uploaded &&
    flags.packet_ready;

  if (allDone) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-white/[0.04] p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl ring-1 ring-white/[0.08] sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/5"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/35 bg-emerald-500/15 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
              <Sparkles className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/90">
                Nexus Launchpad
              </p>
              <p className="text-lg font-semibold text-white">All systems go</p>
              <p className="text-sm text-slate-400">
                Profile, vault, and broker packet workflow are locked in.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            <Rocket className="h-3.5 w-3.5" aria-hidden />
            Mission complete
          </span>
        </div>
        <div className="relative mt-6 rounded-xl border border-white/10 bg-black/25 p-4 backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/85">
            Pro tip
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-slate-300">
            <li>
              Swap the sample PDF for a real stitched packet from your carrier
              vault before emailing brokers.
            </li>
            <li>
              Regenerate after COI or authority changes so every packet matches
              FMCSA.
            </li>
          </ul>
        </div>
      </section>
    );
  }

  const steps: {
    n: 1 | 2 | 3 | 4;
    title: string;
    body: string;
    done: boolean;
    href?: string;
    action?: ReactNode;
  }[] = [
    {
      n: 1,
      title: "Setup profile",
      body: "Full name and dispatch phone so packets and driver texts look sharp.",
      done: flags.profile_done,
      href: "/dashboard/settings",
    },
    {
      n: 2,
      title: "Add carrier",
      body: "Import a carrier with an MC lookup and FMCSA operating status.",
      done: flags.carrier_added,
      href: "/dashboard/carriers/new",
    },
    {
      n: 3,
      title: "Upload docs",
      body: "Drop a W-9 or COI into the first carrier vault to light up compliance.",
      done: flags.doc_uploaded,
      href: firstCarrierId
        ? `/dashboard/carriers/${firstCarrierId}`
        : "/dashboard/carriers/new",
    },
    {
      n: 4,
      title: "Test packet",
      body: "Download a sample broker packet PDF — no vault files required.",
      done: flags.packet_ready,
      action: (
        <button
          type="button"
          disabled={packetBusy}
          onClick={() => void onDummyBrokerPacket()}
          className="inline-flex min-h-12 min-w-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[#007bff]/50 bg-[#007bff]/20 px-4 text-xs font-semibold text-sky-100 shadow-[0_0_20px_rgba(0,123,255,0.2)] backdrop-blur-sm hover:bg-[#007bff]/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {packetBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : null}
          {packetBusy ? "Building…" : "Download sample PDF"}
        </button>
      ),
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.045] shadow-[0_12px_48px_-16px_rgba(0,0,0,0.75)] backdrop-blur-xl ring-1 ring-white/[0.06]">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#007bff]/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative border-b border-white/[0.08] px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-300/90">
              Nexus Launchpad
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
              Welcome back, {displayName}. Clear the runway in four moves.
            </h2>
          </div>
          <div className="w-full shrink-0 md:max-w-sm">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
              <span>Progress</span>
              <span className="tabular-nums font-medium text-slate-200">{pct}%</span>
            </div>
            <div
              className="mt-2 h-3 overflow-hidden rounded-full bg-black/35 ring-1 ring-inset ring-white/10"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#007bff] via-[#38bdf8] to-emerald-400 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: `${pct}%` }}
              >
                {pct > 0 && pct < 100 ? (
                  <span
                    className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    aria-hidden
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ol className="relative divide-y divide-white/[0.06] px-2 py-1 md:px-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="flex flex-col gap-3 px-3 py-4 md:flex-row md:items-start md:justify-between md:gap-6"
          >
            <div className="flex min-w-0 flex-1 gap-3">
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold shadow-inner ${
                  s.done
                    ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-200"
                    : "border-white/15 bg-white/[0.04] text-slate-500"
                }`}
                aria-hidden
              >
                {s.done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : s.n}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                  {s.body}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end md:pt-0.5">
              {s.href ? (
                <Link
                  href={s.href}
                  className="inline-flex min-h-12 min-w-[44px] touch-manipulation items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-slate-100 backdrop-blur-sm hover:border-[#007bff]/45 hover:bg-[#007bff]/15"
                >
                  Open
                </Link>
              ) : null}
              {s.action}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
