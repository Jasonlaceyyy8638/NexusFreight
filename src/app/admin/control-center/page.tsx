import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canAccessNexusControlAdmin } from "@/lib/admin/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NexusControlClient } from "./NexusControlClient";

export const metadata: Metadata = {
  title: "Nexus Control | NexusFreight",
  robots: { index: false, follow: false },
};

export default async function NexusControlPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !canAccessNexusControlAdmin(user.email)) {
    notFound();
  }

  return <NexusControlClient />;
}
