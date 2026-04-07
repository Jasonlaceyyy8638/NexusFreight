"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { CarrierSidebar } from "@/components/dashboard/CarrierSidebar";
import { DashboardDemoBanner } from "@/components/dashboard/DashboardDemoBanner";
import { DashboardNotificationBell } from "@/components/dashboard/DashboardNotificationBell";
import { DispatcherSidebar } from "@/components/dashboard/DispatcherSidebar";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { FoundingMemberBetaNotice } from "@/components/dashboard/FoundingMemberBetaNotice";
import { InteractiveDemoBanner } from "@/components/dashboard/InteractiveDemoBanner";
import type { InteractiveDemoVariant } from "@/lib/demo_data";
import { isCorporateNexusControlSidebarUser } from "@/lib/admin/constants";

export function DashboardShell({
  children,
  demoSession,
  serverInteractiveDemoBanner,
  showNexusControlNav = false,
}: {
  children: ReactNode;
  demoSession: InteractiveDemoVariant | null;
  serverInteractiveDemoBanner: boolean;
  showNexusControlNav?: boolean;
}) {
  const {
    userRole,
    interactiveDemo,
    interactiveDemoVariant,
    authSessionUserId,
    authSessionResolved,
    onboardingRequired,
    supabase,
  } = useDashboardData();

  const [clientNexusControlNav, setClientNexusControlNav] = useState(false);

  useEffect(() => {
    if (!supabase || !authSessionUserId) {
      const id = requestAnimationFrame(() =>
        setClientNexusControlNav(false)
      );
      return () => cancelAnimationFrame(id);
    }
    let cancelled = false;

    const refreshAdminNav = () => {
      void supabase.auth.getUser().then(({ data: { user } }) => {
        if (cancelled) return;
        setClientNexusControlNav(
          isCorporateNexusControlSidebarUser(user?.email)
        );
      });
    };

    refreshAdminNav();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refreshAdminNav();
    });
    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, authSessionUserId]);

  const effectiveNexusControlNav =
    showNexusControlNav || clientNexusControlNav;

  const showInteractiveStrip =
    !authSessionUserId &&
    (serverInteractiveDemoBanner ||
      (authSessionResolved && interactiveDemo));

  const interactiveBannerVariant: InteractiveDemoVariant =
    demoSession ?? interactiveDemoVariant ?? "dispatcher";

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="flex min-h-[100dvh] w-full min-w-0 bg-[#1A1C1E] text-white">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[75] bg-black/55 backdrop-blur-[1px] lg:hidden"
          aria-label="Close navigation menu"
          onClick={closeMobileNav}
        />
      ) : null}

      <div
        id="dashboard-sidebar-panel"
        className={`fixed left-0 top-10 z-[80] flex h-[calc(100dvh-2.5rem)] w-64 max-w-[min(100vw-2rem,16rem)] flex-col shadow-none transition-transform duration-200 ease-out will-change-transform lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          mobileNavOpen
            ? "translate-x-0 shadow-[8px_0_32px_rgba(0,0,0,0.45)]"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {userRole === "carrier" ? (
          <CarrierSidebar
            showNexusControlNav={effectiveNexusControlNav}
            onNavLinkClick={closeMobileNav}
          />
        ) : (
          <DispatcherSidebar
            showNexusControlNav={effectiveNexusControlNav}
            onNavLinkClick={closeMobileNav}
          />
        )}
      </div>

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col pl-0 lg:pl-64">
        <header className="sticky top-0 z-[95] flex h-10 min-h-10 shrink-0 items-center gap-2 border-b border-white/10 bg-[#1A1C1E]/95 px-2 backdrop-blur-sm sm:px-4">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-expanded={mobileNavOpen}
            aria-controls="dashboard-sidebar-panel"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="text-xs font-semibold">Menu</span>
          </button>
          <span className="min-w-0 flex-1" aria-hidden />
          <DashboardNotificationBell />
        </header>
        <FoundingMemberBetaNotice />
        {onboardingRequired ? (
          effectiveNexusControlNav ? (
            <div className="sticky top-10 z-[45] border-b border-violet-500/25 bg-violet-950/35 px-4 py-2.5 text-center text-[11px] font-medium leading-snug text-violet-100/95 backdrop-blur-md sm:px-6 sm:text-xs">
              <span className="block sm:inline">
                You&apos;re signed in, but this login isn&apos;t tied to a{" "}
                <strong className="font-semibold text-white">company workspace</strong>{" "}
                yet—Loads and Carriers stay empty until it is.
              </span>{" "}
              <span className="block sm:mt-1 sm:inline">
                Use{" "}
                <Link
                  href="/admin/control-center"
                  className="font-semibold text-violet-300 underline decoration-violet-400/40 underline-offset-2 hover:text-white"
                >
                  Nexus Control
                </Link>{" "}
                for cross-customer support. To use this dashboard for one fleet,
                finish signup or have your workspace linked in the database.
              </span>
            </div>
          ) : (
            <div className="sticky top-10 z-[45] border-b border-sky-500/25 bg-sky-950/40 px-4 py-2.5 text-center text-[11px] font-medium leading-snug text-sky-100/95 backdrop-blur-md sm:px-6 sm:text-xs">
              You&apos;re signed in, but your account isn&apos;t linked to a{" "}
              <strong className="font-semibold text-white">company workspace</strong>{" "}
              in our database yet (missing organization on your profile). Finish
              checkout/signup so we can create your org, or contact{" "}
              <a
                href="mailto:info@nexusfreight.tech"
                className="font-semibold text-sky-300 underline decoration-sky-400/30 underline-offset-2 hover:decoration-sky-300/60"
              >
                info@nexusfreight.tech
              </a>{" "}
              if you already paid and still see this.
            </div>
          )
        ) : showInteractiveStrip ? (
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
