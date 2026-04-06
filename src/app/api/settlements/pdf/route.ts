import { NextResponse } from "next/server";
import {
  filterDeliveredLoadsForWeek,
  generateSettlementPdf,
} from "@/lib/settlements/generate-settlement";

export const runtime = "nodejs";

type Body = {
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
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="settlement.pdf"',
    },
  });
}
