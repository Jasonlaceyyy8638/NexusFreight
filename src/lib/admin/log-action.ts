import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export async function logAdminAction(input: {
  adminEmail: string;
  affectedUserId: string;
  action: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    console.error("[admin_logs] service role not configured");
    return;
  }
  const { error } = await admin.from("admin_logs").insert({
    admin_email: input.adminEmail,
    affected_user_id: input.affectedUserId,
    action: input.action,
    reason: input.reason?.trim() || null,
    metadata: input.metadata ?? null,
  });
  if (error) {
    console.error("[admin_logs] insert:", error.message);
  }
}
