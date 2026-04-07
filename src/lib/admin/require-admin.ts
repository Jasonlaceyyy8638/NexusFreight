import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canAccessNexusControlAdmin } from "@/lib/admin/constants";

export async function getAdminUserOrNull(): Promise<{
  id: string;
  email: string;
} | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !canAccessNexusControlAdmin(user.email)) return null;
  return { id: user.id, email: user.email.trim().toLowerCase() };
}
