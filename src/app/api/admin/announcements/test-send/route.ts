import { NextResponse } from "next/server";
import { sendProductUpdateTestEmail } from "@/lib/admin/product-update-send";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const admin = await getAdminUserOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: { title?: string; body?: string };
  try {
    body = (await req.json()) as { title?: string; body?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const result = await sendProductUpdateTestEmail({
    title: body.title ?? "",
    body: body.body ?? "",
    toEmail: admin.email,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ ok: true, to: admin.email });
}
