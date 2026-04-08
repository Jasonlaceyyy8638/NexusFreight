"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  DashboardDataProvider,
  useDashboardData,
} from "@/components/dashboard/DashboardDataProvider";
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

/** If org provisioning lags after Stripe, avoid a one-frame onboarding banner. */
function StripeProvisioningRedirect() {
  const router = useRouter();
  const { onboardingRequired, hasStripeSubscription } = useDashboardData();

  useEffect(() => {
    if (!onboardingRequired || !hasStripeSubscription) return;
    router.replace("/auth/provisioning");
  }, [onboardingRequired, hasStripeSubscription, router]);

  return null;
}

export function DashboardLayoutClient({
  children,
  demoSession = null,
  serverInteractiveDemoBanner = false,
  showNexusControlNav = false,
}: {
  children: ReactNode;
  demoSession?: InteractiveDemoVariant | null;
  serverInteractiveDemoBanner?: boolean;
  /** Signed-in user is platform admin (Nexus Control). From server layout. */
  showNexusControlNav?: boolean;
}) {
  return (
    <DashboardDataProvider demoSession={demoSession}>
      <StripeProvisioningRedirect />
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
