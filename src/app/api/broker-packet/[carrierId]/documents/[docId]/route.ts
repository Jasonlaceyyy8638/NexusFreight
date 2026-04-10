import { NextResponse } from "next/server";
import { getCarrierIfMember } from "@/lib/broker-packet/verify-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
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
    .select("id, storage_path")
    .eq("id", docId)
    .eq("carrier_id", carrierId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const path = (row as { storage_path: string }).storage_path;
  await supabase.storage.from("broker_packet_docs").remove([path]);

  const { error } = await supabase.from("carrier_documents").delete().eq("id", docId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
