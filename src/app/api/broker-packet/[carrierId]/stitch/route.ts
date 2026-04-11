import { NextResponse } from "next/server";
import {
  BROKER_PACKET_GENERATE_REQUIRED,
  type BrokerDocCategory,
} from "@/lib/broker-packet/categories";
import { brokerPacketPdfFilename } from "@/lib/broker-packet/broker-packet-filename";
import { getDispatcherContactForBrokerPacket } from "@/lib/broker-packet/dispatcher-contact";
import { prepareBrokerPacketStitchInputs } from "@/lib/broker-packet/prepare-stitch-inputs";
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

  const rowList = (rows ?? []) as {
    doc_category: BrokerDocCategory;
    storage_path: string;
    original_filename: string | null;
  }[];

  const inputs = await prepareBrokerPacketStitchInputs(admin, rowList);

  const dispatcher = await getDispatcherContactForBrokerPacket(supabase, user.id);
  const cover = {
    carrierName: access.name,
    mcNumber: access.mc_number,
    dotNumber: access.dot_number,
    dispatcherName: dispatcher.name,
    dispatcherPhone: dispatcher.phone,
    dispatcherEmail: dispatcher.email,
  };

  const pdfBytes = await stitchBrokerPacketPdf(inputs, cover);

  const filename = brokerPacketPdfFilename(access.name, access.mc_number);

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
