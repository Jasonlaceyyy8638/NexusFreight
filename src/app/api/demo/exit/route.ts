import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const home = new URL("/", url.origin);
  const res = NextResponse.redirect(home);
  res.cookies.set("nexus_demo_mode", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return res;
}
