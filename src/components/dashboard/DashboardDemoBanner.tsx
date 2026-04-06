"use client";

import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";

export function DashboardDemoBanner() {
  const { usingDemo } = useDashboardData();
  if (!usingDemo) return null;
  return (
    <div className="border-b border-amber-500/25 bg-amber-950/35 px-6 py-2 text-center text-xs text-amber-100/95">
      Demo data: connect Supabase and sign in to load live org-scoped data.
    </div>
  );
}
