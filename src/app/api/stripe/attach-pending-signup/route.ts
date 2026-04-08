import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { provisionOrgForProfileFromStripeSession } from "@/lib/stripe/complete-onboarding";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Stripe-first: if the user confirmed email or missed `/auth/signup?session_id=…`,
 * `pending_signups` may still hold their checkout. Link org + subscription once.
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

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server configuration is incomplete." },
      { status: 503 }
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.org_id?.trim()) {
    return NextResponse.json({ recovered: false, reason: "already_linked" });
  }

  const email = user.email.trim().toLowerCase();

  const { data: pendingRows, error: pendErr } = await admin
    .from("pending_signups")
    .select("stripe_checkout_session_id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (pendErr) {
    return NextResponse.json(
      { error: pendErr.message },
      { status: 500 }
    );
  }

  const sessionId = pendingRows?.[0]?.stripe_checkout_session_id?.trim();
  if (!sessionId) {
    return NextResponse.json({ recovered: false, reason: "no_pending" });
  }

  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });

  if (session.status !== "complete") {
    return NextResponse.json(
      { recovered: false, reason: "session_incomplete" },
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

  if (!sessionEmail || sessionEmail !== email) {
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

  return NextResponse.json({ recovered: true });
}
