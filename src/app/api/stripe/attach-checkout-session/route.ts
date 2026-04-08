import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { provisionOrgForProfileFromStripeSession } from "@/lib/stripe/complete-onboarding";

export const runtime = "nodejs";

/**
 * After signup: link the Stripe Checkout session (same email as billing) to the new user.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!secret || !url || !anon) {
    return NextResponse.json(
      { error: "Server configuration is incomplete." },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const token =
    authHeader?.startsWith("Bearer ") && authHeader.length > 7
      ? authHeader.slice(7).trim()
      : "";

  if (!token) {
    return NextResponse.json({ error: "Authorization required." }, { status: 401 });
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.email) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  let body: { session_id?: string };
  try {
    body = (await req.json()) as { session_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const sessionId = body.session_id?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required." }, { status: 400 });
  }

  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });

  if (session.status !== "complete") {
    return NextResponse.json(
      { error: "Checkout session is not complete." },
      { status: 409 }
    );
  }

  const sessionEmail = (
    session.customer_details?.email ||
    session.customer_email ||
    ""
  )
    .trim()
    .toLowerCase();

  if (!sessionEmail || sessionEmail !== user.email.trim().toLowerCase()) {
    return NextResponse.json(
      { error: "Email must match the Stripe checkout billing email." },
      { status: 403 }
    );
  }

  const result = await provisionOrgForProfileFromStripeSession(
    stripe,
    user.id,
    session
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Could not complete onboarding." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
