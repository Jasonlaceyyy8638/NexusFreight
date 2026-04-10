import { NextResponse } from "next/server";
import { sendBrokerPacketToBroker } from "@/lib/broker-packet/send-packet-email";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/send-packet
 * Body: { carrierId: string, to: string }
 * Stitches broker packet PDFs and emails via Resend (same behavior as
 * POST /api/broker-packet/[carrierId]/send).
 */
export async function POST(req: Request) {
  let body: { carrierId?: string; to?: string };
  try {
    body = (await req.json()) as { carrierId?: string; to?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const carrierId = body.carrierId?.trim() ?? "";
  if (!carrierId) {
    return NextResponse.json({ error: "carrierId is required." }, { status: 400 });
  }

  const to = body.to?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await sendBrokerPacketToBroker(supabase, user.id, carrierId, to);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
