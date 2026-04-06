import { NextResponse } from "next/server";
import { computeLaneMileage } from "@/lib/mapbox/mileage-server";

export const runtime = "nodejs";

type Body = {
  origin?: string;
  destination?: string;
  fromLng?: number | null;
  fromLat?: number | null;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const origin = typeof body.origin === "string" ? body.origin.trim() : "";
  const destination =
    typeof body.destination === "string" ? body.destination.trim() : "";
  if (!origin || !destination) {
    return NextResponse.json(
      { error: "origin and destination are required." },
      { status: 400 }
    );
  }

  const result = await computeLaneMileage({
    originAddress: origin,
    destinationAddress: destination,
    fromLng: body.fromLng,
    fromLat: body.fromLat,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result.miles);
}
