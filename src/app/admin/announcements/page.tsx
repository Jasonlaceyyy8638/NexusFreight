import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnnouncementsClient } from "@/components/admin/AnnouncementsClient";
import { canAccessNexusControlAdmin } from "@/lib/admin/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Announcements | Nexus Control",
  robots: { index: false, follow: false },
};

export default async function AdminAnnouncementsPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !canAccessNexusControlAdmin(user.email)) {
    notFound();
  }

  return <AnnouncementsClient />;
}
