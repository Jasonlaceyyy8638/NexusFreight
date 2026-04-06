import { NextResponse } from "next/server";
import {
  filterDeliveredLoadsForWeek,
  generateSettlementPdf,
} from "@/lib/settlements/generate-settlement";
import { sendEmailWithAttachment, sendgridConfigured } from "@/lib/email/sendgrid-send";

export const runtime = "nodejs";

type Body = {
  to?: string;
  organizationName?: string;
  carrierName?: string;
  carrierMc?: string | null;
  feePercent?: number;
  serviceFeeType?: "percent" | "flat";
  feeFlatCents?: number | null;
  weekStart?: string;
  weekEnd?: string;
  loads?: Array<{
    id: string;
    origin: string;
    destination: string;
    rate_cents: number;
    status: string;
    delivered_at: string | null;
  }>;
};

export async function POST(req: Request) {
  if (!sendgridConfigured()) {
    return NextResponse.json(
      { error: "SendGrid is not configured (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL)." },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Valid recipient email (to) is required." }, { status: 400 });
  }

  const org = body.organizationName ?? "NexusFreight";
  const carrier = body.carrierName;
  const fee = body.feePercent;
  const feeType = body.serviceFeeType === "flat" ? "flat" : "percent";
  if (!carrier) {
    return NextResponse.json(
      { error: "carrierName is required." },
      { status: 400 }
    );
  }
  if (feeType === "percent" && typeof fee !== "number") {
    return NextResponse.json(
      { error: "feePercent is required for percentage service fees." },
      { status: 400 }
    );
  }
  if (feeType === "flat" && (body.feeFlatCents == null || Number.isNaN(Number(body.feeFlatCents)))) {
    return NextResponse.json(
      { error: "feeFlatCents is required for flat service fees." },
      { status: 400 }
    );
  }

  const weekStart = body.weekStart
    ? new Date(body.weekStart)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekEnd = body.weekEnd ? new Date(body.weekEnd) : new Date();

  const delivered = filterDeliveredLoadsForWeek(
    body.loads ?? [],
    weekStart,
    weekEnd
  );

  const pdf = generateSettlementPdf({
    organizationName: org,
    carrierName: carrier,
    carrierMc: body.carrierMc ?? null,
    weekStart,
    weekEnd,
    feePercent: typeof fee === "number" ? fee : 0,
    serviceFeeType: feeType,
    feeFlatCents:
      feeType === "flat" ? Math.round(Number(body.feeFlatCents)) : null,
    loads: delivered,
  });

  const safeName = carrier.replace(/[^\w\-]+/g, "-").slice(0, 60);
  const filename = `settlement-${safeName}.pdf`;

  try {
    await sendEmailWithAttachment({
      to,
      subject: `Weekly settlement — ${carrier}`,
      text: `Attached: weekly settlement statement for ${carrier} (${weekStart.toLocaleDateString()} – ${weekEnd.toLocaleDateString()}).\n\n— NexusFreight`,
      attachment: {
        filename,
        contentBase64: pdf.toString("base64"),
        mimeType: "application/pdf",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
