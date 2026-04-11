import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Sample one-page PDF for Nexus Launchpad “test packet” (no carrier docs required). */
export async function GET() {
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

  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const body = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("Broker setup packet (sample)", {
    x: 72,
    y: 680,
    size: 20,
    font,
    color: rgb(0.1, 0.45, 0.95),
  });
  page.drawText("NexusFreight — practice export for onboarding.", {
    x: 72,
    y: 648,
    size: 11,
    font: body,
    color: rgb(0.25, 0.28, 0.32),
  });
  page.drawText(
    "Replace this with your stitched packet from a carrier vault when you are ready to go live.",
    {
      x: 72,
      y: 612,
      size: 10,
      font: body,
      color: rgb(0.35, 0.38, 0.42),
      maxWidth: 468,
      lineHeight: 14,
    }
  );
  const bytes = await doc.save();

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="NexusFreight-Broker-Packet-Sample.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
