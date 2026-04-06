import { NextResponse } from "next/server";
import twilio from "twilio";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!sid || !token || !from) {
    return NextResponse.json(
      { error: "Twilio environment variables are not configured." },
      { status: 503 }
    );
  }

  let body: {
    loadId?: string;
    driverPhone?: string;
    origin?: string;
    destination?: string;
    rateCents?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { loadId, driverPhone, origin, destination, rateCents } = body;
  if (!loadId || !driverPhone || !origin || !destination) {
    return NextResponse.json(
      { error: "loadId, driverPhone, origin, and destination are required." },
      { status: 400 }
    );
  }

  const rate =
    typeof rateCents === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(rateCents / 100)
      : "—";

  const trackUrl = `${baseUrl.replace(/\/$/, "")}/track/${loadId}`;
  const text = [
    `NexusFreight dispatch: ${origin} → ${destination}.`,
    `Rate: ${rate}.`,
    `Track: ${trackUrl}`,
  ].join(" ");

  const client = twilio(sid, token);
  try {
    await client.messages.create({
      from,
      to: driverPhone,
      body: text,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Twilio error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
