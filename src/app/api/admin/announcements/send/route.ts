import { NextResponse } from "next/server";
import { listInactiveAnnouncementRecipients } from "@/lib/admin/announcement-reengagement";
import { sendProductUpdateBroadcast } from "@/lib/admin/product-update-send";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SendBody = {
  title?: string;
  body?: string;
  confirmPhrase?: string;
  /** `inactive_7d` = only users with no announcement open in the last 7 days. */
  audience?: "all" | "inactive_7d";
};

/**
 * Sends product announcements via Resend (Node). Does not require a deployed Edge Function.
 */
export async function POST(req: Request) {
  const admin = await getAdminUserOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: SendBody;
  try {
    body = (await req.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  let onlyProfileIds: Set<string> | null = null;
  if (body.audience === "inactive_7d") {
    const svc = createServiceRoleSupabaseClient();
    if (!svc) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 503 }
      );
    }
    const inactive = await listInactiveAnnouncementRecipients(svc, 7);
    onlyProfileIds = new Set(inactive.map((r) => r.profile_id));
  }

  const result = await sendProductUpdateBroadcast({
    title: body.title ?? "",
    body: body.body ?? "",
    confirmPhrase: body.confirmPhrase ?? "",
    onlyProfileIds,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        ...(result.code ? { code: result.code } : {}),
        ...(result.errors ? { errors: result.errors } : {}),
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    recipient_count: result.recipient_count,
    attempted: result.attempted,
    ...(result.announcement_id
      ? { announcement_id: result.announcement_id }
      : {}),
    ...(result.errors ? { errors: result.errors } : {}),
  });
}
