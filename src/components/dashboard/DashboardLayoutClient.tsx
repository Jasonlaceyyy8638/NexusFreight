"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { InteractiveDemoVariant } from "@/lib/demo_data";

/**
 * If middleware did not run (misconfig) or the cookie was missing, `?demo=carrier`
 * still lands here — sync cookie + refresh so the server layout passes the right variant.
 */
function DemoQuerySync() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("demo");
    if (d !== "dispatcher" && d !== "carrier") return;
    document.cookie = `nexus_demo_mode=${d};path=/;max-age=${60 * 60 * 8};SameSite=Lax`;
    params.delete("demo");
    const qs = params.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`);
    router.refresh();
  }, [router]);

  return null;
}

export function DashboardLayoutClient({
  children,
  demoSession = null,
  serverInteractiveDemoBanner = false,
  showNexusControlNav = false,
  serverOnboardingRequired = false,
}: {
  children: ReactNode;
  demoSession?: InteractiveDemoVariant | null;
  serverInteractiveDemoBanner?: boolean;
  /** Signed-in user is platform admin (Nexus Control). From server layout. */
  showNexusControlNav?: boolean;
  /** From server profile row — prevents false banner when client fetch lags behind DB. */
  serverOnboardingRequired?: boolean;
}) {
  return (
    <DashboardDataProvider
      demoSession={demoSession}
      serverOnboardingRequired={serverOnboardingRequired}
    >
      <Toaster richColors position="top-center" theme="dark" />
      <DemoQuerySync />
      <DashboardShell
        demoSession={demoSession}
        serverInteractiveDemoBanner={serverInteractiveDemoBanner}
        showNexusControlNav={showNexusControlNav}
      >
        {children}
      </DashboardShell>
    </DashboardDataProvider>
  );
}
