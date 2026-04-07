"use client";

import type { ReactNode } from "react";
import { CarrierSidebar } from "@/components/dashboard/CarrierSidebar";
import { DashboardDemoBanner } from "@/components/dashboard/DashboardDemoBanner";
import { DashboardNotificationBell } from "@/components/dashboard/DashboardNotificationBell";
import { DispatcherSidebar } from "@/components/dashboard/DispatcherSidebar";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { FoundingMemberBetaNotice } from "@/components/dashboard/FoundingMemberBetaNotice";
import { InteractiveDemoBanner } from "@/components/dashboard/InteractiveDemoBanner";
import type { InteractiveDemoVariant } from "@/lib/demo_data";

export function DashboardShell({
  children,
  demoSession,
  serverInteractiveDemoBanner,
}: {
  children: ReactNode;
  demoSession: InteractiveDemoVariant | null;
  serverInteractiveDemoBanner: boolean;
}) {
  const {
    userRole,
    interactiveDemo,
    interactiveDemoVariant,
    authSessionUserId,
    authSessionResolved,
  } = useDashboardData();

  const showInteractiveStrip =
    !authSessionUserId &&
    (serverInteractiveDemoBanner ||
      (authSessionResolved && interactiveDemo));

  const interactiveBannerVariant: InteractiveDemoVariant =
    demoSession ?? interactiveDemoVariant ?? "dispatcher";

  return (
    <div className="flex min-h-[100dvh] w-full min-w-0 bg-[#1A1C1E] text-white">
      {userRole === "carrier" ? <CarrierSidebar /> : <DispatcherSidebar />}
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col pl-64">
        <header className="sticky top-0 z-[95] flex h-10 shrink-0 items-center justify-end border-b border-white/10 bg-[#1A1C1E]/95 px-4 backdrop-blur-sm">
          <DashboardNotificationBell />
        </header>
        <FoundingMemberBetaNotice />
        {showInteractiveStrip ? (
          <InteractiveDemoBanner variant={interactiveBannerVariant} />
        ) : (
          <DashboardDemoBanner />
        )}
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
