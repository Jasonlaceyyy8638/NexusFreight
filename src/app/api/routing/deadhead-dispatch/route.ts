import { NextResponse } from "next/server";
import { calculateRouteMiles } from "@/lib/maps";

export const runtime = "nodejs";

type Body = {
  fromLng?: number | null;
  fromLat?: number | null;
  pickupAddress?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pickup =
    typeof body.pickupAddress === "string" ? body.pickupAddress.trim() : "";
  if (!pickup) {
    return NextResponse.json(
      { error: "pickupAddress is required." },
      { status: 400 }
    );
  }

  const lng = body.fromLng;
  const lat = body.fromLat;
  if (
    lng == null ||
    lat == null ||
    Number.isNaN(Number(lng)) ||
    Number.isNaN(Number(lat))
  ) {
    return NextResponse.json(
      { error: "fromLng and fromLat are required for deadhead routing." },
      { status: 400 }
    );
  }

  const result = await calculateRouteMiles(
    { lng: Number(lng), lat: Number(lat) },
    { address: pickup }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ deadheadMiles: result.miles });
}
