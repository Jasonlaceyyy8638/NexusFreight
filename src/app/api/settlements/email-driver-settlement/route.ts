import { NextResponse } from "next/server";
import { generateDriverSettlementPdf } from "@/lib/settlements/generate-driver-settlement";
import { sendEmailWithAttachment, sendgridConfigured } from "@/lib/email/sendgrid-send";
import type { DriverPayStructure } from "@/types/database";

export const runtime = "nodejs";

type Body = {
  to?: string;
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
  if (!sendgridConfigured()) {
    return NextResponse.json(
      {
        error:
          "SendGrid is not configured (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL).",
      },
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
    return NextResponse.json(
      { error: "Valid recipient email (to) is required." },
      { status: 400 }
    );
  }

  const fleetName = typeof body.fleetName === "string" ? body.fleetName.trim() : "";
  const driverName = typeof body.driverName === "string" ? body.driverName.trim() : "";
  const loadId = typeof body.loadId === "string" ? body.loadId.trim() : "";
  const origin = typeof body.origin === "string" ? body.origin.trim() : "";
  const destination = typeof body.destination === "string" ? body.destination.trim() : "";
  if (!fleetName || !driverName || !loadId || !origin || !destination) {
    return NextResponse.json(
      { error: "Missing required settlement fields." },
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

  const filename = `driver-settlement-${loadId.slice(0, 8)}.pdf`;

  try {
    await sendEmailWithAttachment({
      to,
      subject: `Settlement — ${origin} to ${destination}`,
      text: `Attached: driver settlement for load ${loadId} (${origin} → ${destination}).\n\n— ${fleetName}`,
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
