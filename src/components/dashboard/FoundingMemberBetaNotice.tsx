"use client";

import { useEffect, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";

export function FoundingMemberBetaNotice() {
  const { interactiveDemo, isBetaUser } = useDashboardData();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // SSR + first client pass: skip beta copy entirely so markup matches (no context drift).
  if (!hasMounted) return null;
  if (interactiveDemo || !isBetaUser) return null;

  return (
    <div className="border-b border-emerald-500/15 bg-emerald-950/15 px-4 py-2.5">
      <p className="mx-auto max-w-4xl text-center text-[11px] leading-relaxed text-emerald-100/88 sm:text-xs">
        Founding Member Beta Access. Help us build the future of logistics.
        Found a bug? 📸 Screenshot it and send to{" "}
        <a
          href="mailto:info@nexusfreight.tech?subject=NexusFreight%20beta%20feedback"
          className="font-semibold text-emerald-200 underline decoration-emerald-500/40 underline-offset-2 hover:text-white"
        >
          info@nexusfreight.tech
        </a>
        .
      </p>
    </div>
  );
}
