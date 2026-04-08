"use client";

import { useEffect, useState } from "react";
import { FOUNDING_MEMBER_CAP } from "@/lib/beta/founding-cap";

type BetaPayload = {
  profileCount: number;
  foundingSpotsRemaining: number;
  betaCap: number;
};

export function BetaLaunchBanner() {
  const [data, setData] = useState<BetaPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/public/beta-spots", { cache: "no-store" });
        const j = (await res.json()) as Partial<BetaPayload>;
        if (cancelled) return;
        setData({
          profileCount: typeof j.profileCount === "number" ? j.profileCount : 0,
          foundingSpotsRemaining:
            typeof j.foundingSpotsRemaining === "number"
              ? j.foundingSpotsRemaining
              : FOUNDING_MEMBER_CAP,
          betaCap: typeof j.betaCap === "number" ? j.betaCap : FOUNDING_MEMBER_CAP,
        });
      } catch {
        if (!cancelled) {
          setData({
            profileCount: 0,
            foundingSpotsRemaining: FOUNDING_MEMBER_CAP,
            betaCap: FOUNDING_MEMBER_CAP,
          });
        }
      }
    }
    void load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const remaining =
    data?.foundingSpotsRemaining ?? data?.betaCap ?? FOUNDING_MEMBER_CAP;
  const showFounding = remaining > 0;

  return (
    <div
      className="sticky top-0 z-[90] border-b border-emerald-500/25 bg-gradient-to-r from-emerald-950/95 via-[#0f172a]/98 to-emerald-950/95 px-4 py-2.5 text-center shadow-[0_4px_24px_-4px_rgba(16,185,129,0.25)] backdrop-blur-md"
      role="region"
      aria-label="Beta launch announcement"
    >
      <p className="mx-auto max-w-4xl text-xs font-medium leading-snug text-emerald-50/95 sm:text-sm">
        {showFounding ? (
          <>
            🚀 BETA LAUNCH: Only{" "}
            <span className="font-bold tabular-nums text-white">
              {remaining}
            </span>{" "}
            of {data?.betaCap ?? FOUNDING_MEMBER_CAP} Founding Member spots remaining! Get 45
            days FREE (No credit card required).
          </>
        ) : (
          <>
            Start your 7-day free trial today. No credit card required.
          </>
        )}
      </p>
    </div>
  );
}
