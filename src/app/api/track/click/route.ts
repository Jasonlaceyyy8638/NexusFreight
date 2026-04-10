import { NextResponse } from "next/server";
import {
  isAllowedTrackedRedirectUrl,
  isUuid,
} from "@/lib/admin/announcement-tracking";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const DEFAULT_REDIRECT = "https://nexusfreight.tech/dashboard";

/**
 * Log first tracked link click, then 302 to the final URL (allowlisted).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const announcementId = searchParams.get("a")?.trim() ?? "";
  const userId = searchParams.get("u")?.trim() ?? "";
  let destination = searchParams.get("url")?.trim() ?? "";

  if (!isUuid(announcementId) || !isUuid(userId)) {
    return NextResponse.redirect(DEFAULT_REDIRECT, 302);
  }

  try {
    destination = decodeURIComponent(destination);
  } catch {
    return NextResponse.redirect(DEFAULT_REDIRECT, 302);
  }

  if (!isAllowedTrackedRedirectUrl(destination)) {
    return NextResponse.redirect(DEFAULT_REDIRECT, 302);
  }

  const svc = createServiceRoleSupabaseClient();
  if (svc) {
    try {
      const { data: logRow } = await svc
        .from("product_update_send_log")
        .select("id")
        .eq("id", announcementId)
        .maybeSingle();

      if (logRow?.id) {
        const { data: profileRow } = await svc
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (profileRow?.id) {
          const { error } = await svc.rpc("record_announcement_click", {
            p_announcement: announcementId,
            p_user: userId,
          });
          if (error) {
            console.error("[track/click]", error.message);
          }
        }
      }
    } catch (e) {
      console.error("[track/click]", e);
    }
  }

  return NextResponse.redirect(destination, 302);
}
