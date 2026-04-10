import { NextResponse } from "next/server";
import type { BrokerDocCategory } from "@/lib/broker-packet/categories";
import { BROKER_DOC_CATEGORIES } from "@/lib/broker-packet/categories";
import { stitchBrokerPacketPdf } from "@/lib/broker-packet/stitch-pdf";
import { getCarrierIfMember } from "@/lib/broker-packet/verify-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ carrierId: string }> }
) {
  const { carrierId } = await ctx.params;
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

  const { data: rows, error } = await supabase
    .from("carrier_documents")
    .select("doc_category, storage_path, original_filename")
    .eq("carrier_id", carrierId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role not configured." },
      { status: 503 }
    );
  }

  const inputs: {
    category: BrokerDocCategory;
    bytes: Buffer;
    filename: string;
  }[] = [];

  const order = new Map(
    BROKER_DOC_CATEGORIES.map((c, i) => [c, i] as const)
  );

  const sorted = [...(rows ?? [])].sort(
    (a, b) =>
      (order.get((a as { doc_category: BrokerDocCategory }).doc_category) ??
        99) -
      (order.get((b as { doc_category: BrokerDocCategory }).doc_category) ??
        99)
  );

  for (const r of sorted) {
    const doc_category = (r as { doc_category: BrokerDocCategory }).doc_category;
    const storage_path = (r as { storage_path: string }).storage_path;
    const original_filename =
      (r as { original_filename: string | null }).original_filename ?? "file.pdf";
    const { data: file, error: dlErr } = await admin.storage
      .from("broker_packet_docs")
      .download(storage_path);
    if (dlErr || !file) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    inputs.push({
      category: doc_category,
      bytes: buf,
      filename: original_filename,
    });
  }

  const pdfBytes = await stitchBrokerPacketPdf(inputs);

  const filename = `Broker-Setup-Packet-${access.name.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
