import { NextResponse } from "next/server";

/** Clears the hands-on preview cookie without redirecting (call after sign-in). */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("nexus_demo_mode", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return res;
}
