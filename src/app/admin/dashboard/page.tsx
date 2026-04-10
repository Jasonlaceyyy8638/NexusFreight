import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommandCenterDashboard } from "@/components/admin/CommandCenterDashboard";
import { canAccessNexusControlAdmin } from "@/lib/admin/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Command Center | Nexus Control",
  robots: { index: false, follow: false },
};

export default async function AdminCommandCenterDashboardPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !canAccessNexusControlAdmin(user.email)) {
    notFound();
  }

  return <CommandCenterDashboard />;
}
