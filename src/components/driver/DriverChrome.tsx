"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DriverBottomNav } from "@/components/driver/DriverBottomNav";
import { useDriverMobileDevice } from "@/lib/hooks/useDriverMobileDevice";

export function DriverChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isMobile = useDriverMobileDevice();
  const hideNavForDesktopDashboard =
    mounted && pathname === "/driver/dashboard" && !isMobile;

  if (pathname === "/driver/desktop-only") {
    return (
      <div className="min-h-[100dvh] bg-[#0D0E10] text-white">{children}</div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0D0E10] text-white">
      <main
        className={
          hideNavForDesktopDashboard
            ? "flex min-h-0 flex-1 flex-col overflow-y-auto"
            : "flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-28 pt-4"
        }
      >
        {children}
      </main>
      {hideNavForDesktopDashboard ? null : <DriverBottomNav />}
    </div>
  );
}
