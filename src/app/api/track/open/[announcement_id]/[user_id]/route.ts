import { NextResponse } from "next/server";
import {
  ANNOUNCEMENT_TRACKING_PIXEL,
  isUuid,
} from "@/lib/admin/announcement-tracking";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Log first open for this announcement + profile, return a 1×1 transparent GIF.
 * Public (email clients); uses service role server-side only.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ announcement_id: string; user_id: string }> }
) {
  const { announcement_id: announcementId, user_id: userId } = await context.params;

  if (!isUuid(announcementId) || !isUuid(userId)) {
    return pixelResponse();
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return pixelResponse();
  }

  try {
    const { data: logRow } = await svc
      .from("product_update_send_log")
      .select("id")
      .eq("id", announcementId)
      .maybeSingle();

    if (!logRow?.id) {
      return pixelResponse();
    }

    const { data: profileRow } = await svc
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!profileRow?.id) {
      return pixelResponse();
    }

    const { error } = await svc.rpc("record_announcement_open", {
      p_announcement: announcementId,
      p_user: userId,
    });
    if (error) {
      console.error("[track/open]", error.message);
    }
  } catch (e) {
    console.error("[track/open]", e);
  }

  return pixelResponse();
}

function pixelResponse(): NextResponse {
  return new NextResponse(new Uint8Array(ANNOUNCEMENT_TRACKING_PIXEL), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  });
}
