import { cookies } from "next/headers";
import { DashboardLayoutClient } from "@/components/dashboard/DashboardLayoutClient";
import type { InteractiveDemoVariant } from "@/lib/demo_data";
import {
  canAccessNexusControlAdmin,
  isCorporateNexusControlSidebarUser,
} from "@/lib/admin/constants";
import { profileHasWorkspaceLink } from "@/lib/dashboard/workspace-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const raw = jar.get("nexus_demo_mode")?.value;
  const cookieDemo: InteractiveDemoVariant | null =
    raw === "dispatcher" || raw === "carrier" ? raw : null;

  let serverAuthUserId: string | null = null;
  let nexusControlSidebar = false;
  /** Matches DB before client hydrates — avoids a false "missing org" banner when the row already has org_id. */
  let serverOnboardingRequired = false;
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    serverAuthUserId = session?.user?.id ?? null;
    nexusControlSidebar = isCorporateNexusControlSidebarUser(
      session?.user?.email
    );
    if (serverAuthUserId) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("org_id, role")
        .eq("id", serverAuthUserId)
        .maybeSingle();
      const corporateFullAccess = canAccessNexusControlAdmin(
        session?.user?.email
      );
      serverOnboardingRequired = corporateFullAccess
        ? false
        : !profileHasWorkspaceLink(profileRow);
    }
  }

  /**
   * Signed-in accounts must never hydrate demo sandbox data (cookie may still
   * exist until `/api/demo/clear-cookie` runs). Product tour is guests only.
   */
  const demoSession: InteractiveDemoVariant | null = serverAuthUserId
    ? null
    : cookieDemo;

  /** Same boolean on SSR and first client paint — avoids hydration mismatch for demo chrome. */
  const serverInteractiveDemoBanner =
    Boolean(demoSession) && !serverAuthUserId;

  return (
    <div className="min-h-[100dvh] w-full bg-[#1A1C1E]">
      <DashboardLayoutClient
        demoSession={demoSession}
        serverInteractiveDemoBanner={serverInteractiveDemoBanner}
        showNexusControlNav={nexusControlSidebar}
        serverOnboardingRequired={serverOnboardingRequired}
      >
        {children}
      </DashboardLayoutClient>
    </div>
  );
}
