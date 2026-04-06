import { NextResponse } from "next/server";
import { generateDriverSettlementPdf } from "@/lib/settlements/generate-driver-settlement";
import type { DriverPayStructure } from "@/types/database";

export const runtime = "nodejs";

type Body = {
  fleetName?: string;
  driverName?: string;
  driverEmail?: string | null;
  loadId?: string;
  origin?: string;
  destination?: string;
  rateCents?: number;
  payStructure?: DriverPayStructure;
  payPercentOfGross?: number;
  payCpmCents?: number;
  loadedMiles?: number;
  deadheadMiles?: number;
  payDeadhead?: boolean;
  deadheadRateCpmCents?: number | null;
  deadheadPayCents?: number;
  loadedDriverPayCents?: number;
  driverTotalPayCents?: number;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fleetName = typeof body.fleetName === "string" ? body.fleetName.trim() : "";
  const driverName = typeof body.driverName === "string" ? body.driverName.trim() : "";
  const loadId = typeof body.loadId === "string" ? body.loadId.trim() : "";
  const origin = typeof body.origin === "string" ? body.origin.trim() : "";
  const destination = typeof body.destination === "string" ? body.destination.trim() : "";
  if (!fleetName || !driverName || !loadId || !origin || !destination) {
    return NextResponse.json(
      { error: "fleetName, driverName, loadId, origin, and destination are required." },
      { status: 400 }
    );
  }

  const rateCents = Number(body.rateCents);
  if (!Number.isFinite(rateCents)) {
    return NextResponse.json({ error: "rateCents is required." }, { status: 400 });
  }

  const pdf = generateDriverSettlementPdf({
    fleetName,
    driverName,
    driverEmail: body.driverEmail ?? null,
    loadId,
    origin,
    destination,
    rateCents,
    payStructure: body.payStructure === "cpm" ? "cpm" : "percent_gross",
    payPercentOfGross: Number(body.payPercentOfGross ?? 30),
    payCpmCents: Number(body.payCpmCents ?? 70),
    loadedMiles: Number(body.loadedMiles ?? 0),
    deadheadMiles: Number(body.deadheadMiles ?? 0),
    payDeadhead: Boolean(body.payDeadhead),
    deadheadRateCpmCents:
      body.deadheadRateCpmCents != null
        ? Number(body.deadheadRateCpmCents)
        : null,
    deadheadPayCents: Number(body.deadheadPayCents ?? 0),
    loadedDriverPayCents: Number(body.loadedDriverPayCents ?? 0),
    driverTotalPayCents: Number(body.driverTotalPayCents ?? 0),
  });

  const safe = driverName.replace(/\s+/g, "-").slice(0, 40);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="driver-settlement-${safe}-${loadId.slice(0, 8)}.pdf"`,
    },
  });
}
