import { NextResponse } from "next/server";
import { fetchCompanyData } from "@/lib/fmcsa_service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { number?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const number = typeof body.number === "string" ? body.number : "";
  const result = await fetchCompanyData(number);

  if (!result.ok) {
    if (result.code === "missing_key") {
      return NextResponse.json(result, { status: 503 });
    }
    if (result.code === "empty") {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json(result);
}
