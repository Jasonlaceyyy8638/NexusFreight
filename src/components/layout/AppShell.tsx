"use client";

import { usePathname } from "next/navigation";
import { BetaSupportBanner } from "@/components/support/BetaSupportBanner";

/**
 * Marketing / dashboard chrome. Driver mobile routes hide the global beta strip and top offset.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDriverRoute = pathname.startsWith("/driver");

  return (
    <>
      {!isDriverRoute && <BetaSupportBanner />}
      <div
        suppressHydrationWarning
        className={
          isDriverRoute
            ? "flex min-h-[100dvh] flex-1 flex-col"
            : "flex min-h-[100dvh] flex-1 flex-col pt-10"
        }
      >
        {children}
      </div>
    </>
  );
}
