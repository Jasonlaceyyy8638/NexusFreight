"use client";

import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";

export function DashboardDemoBanner() {
  const { usingDemo, authSessionUserId, authSessionResolved } =
    useDashboardData();
  if (!authSessionResolved || !usingDemo) return null;
  if (authSessionUserId) return null;
  return (
    <div className="border-b border-amber-500/25 bg-amber-950/35 px-6 py-2 text-center text-xs text-amber-100/95">
      Demo data: sign in to load your organization&apos;s live data in this
      workspace.
    </div>
  );
}
