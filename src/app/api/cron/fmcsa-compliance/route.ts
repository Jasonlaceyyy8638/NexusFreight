import { NextResponse } from "next/server";
import { runFmcsaComplianceMonitor } from "@/lib/compliance/run-fmcsa-compliance-monitor";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

/** Netlify scheduled function (or manual) — Bearer CRON_SECRET */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set." },
      { status: 503 }
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const result = await runFmcsaComplianceMonitor();
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  return POST(req);
}
