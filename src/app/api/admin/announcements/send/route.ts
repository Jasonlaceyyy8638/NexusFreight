import { NextResponse } from "next/server";
import { sendProductUpdateBroadcast } from "@/lib/admin/product-update-send";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";

export const runtime = "nodejs";

type SendBody = {
  title?: string;
  body?: string;
  confirmPhrase?: string;
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

  const result = await sendProductUpdateBroadcast({
    title: body.title ?? "",
    body: body.body ?? "",
    confirmPhrase: body.confirmPhrase ?? "",
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
    ...(result.errors ? { errors: result.errors } : {}),
  });
}
