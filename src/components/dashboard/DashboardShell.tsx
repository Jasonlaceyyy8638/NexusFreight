"use client";

import type { ReactNode } from "react";
import { CarrierSidebar } from "@/components/dashboard/CarrierSidebar";
import { DashboardDemoBanner } from "@/components/dashboard/DashboardDemoBanner";
import { DashboardNotificationBell } from "@/components/dashboard/DashboardNotificationBell";
import { DispatcherSidebar } from "@/components/dashboard/DispatcherSidebar";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { InteractiveDemoBanner } from "@/components/dashboard/InteractiveDemoBanner";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { userRole, interactiveDemo } = useDashboardData();

  return (
    <div className="flex min-h-screen bg-[#1A1C1E] text-white">
      {userRole === "carrier" ? <CarrierSidebar /> : <DispatcherSidebar />}
      <div className="flex min-h-screen flex-1 flex-col pl-64">
        <header className="sticky top-0 z-[95] flex h-10 shrink-0 items-center justify-end border-b border-white/10 bg-[#1A1C1E]/95 px-4 backdrop-blur-sm">
          <DashboardNotificationBell />
        </header>
        {interactiveDemo ? (
          <InteractiveDemoBanner />
        ) : (
          <DashboardDemoBanner />
        )}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
