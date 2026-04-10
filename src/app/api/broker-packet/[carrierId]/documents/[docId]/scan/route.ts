import { NextResponse } from "next/server";
import { scanCoiPdfForExpiry } from "@/lib/broker-packet/coi-expiry-scan";
import { getCarrierIfMember } from "@/lib/broker-packet/verify-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ carrierId: string; docId: string }> }
) {
  const { carrierId, docId } = await ctx.params;
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

  const access = await getCarrierIfMember(supabase, user.id, carrierId);
  if (!access) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: row } = await supabase
    .from("carrier_documents")
    .select("id, doc_category, storage_path")
    .eq("id", docId)
    .eq("carrier_id", carrierId)
    .maybeSingle();

  if (!row || (row as { doc_category: string }).doc_category !== "coi") {
    return NextResponse.json(
      { error: "Scan is only available for COI documents." },
      { status: 400 }
    );
  }

  const storagePath = (row as { storage_path: string }).storage_path;
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role not configured." },
      { status: 503 }
    );
  }

  const { data: file, error: dlErr } = await admin.storage
    .from("broker_packet_docs")
    .download(storagePath);
  if (dlErr || !file) {
    return NextResponse.json({ error: "Could not read file." }, { status: 500 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const { expiryDate } = await scanCoiPdfForExpiry(buf);

  const { data: updated, error: upErr } = await supabase
    .from("carrier_documents")
    .update({ expiry_date: expiryDate })
    .eq("id", docId)
    .select()
    .maybeSingle();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ document: updated, detected_expiry: expiryDate });
}
