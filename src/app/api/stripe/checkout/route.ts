import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

  if (!secret || !priceId) {
    return NextResponse.json(
      { error: "Stripe is not configured (STRIPE_SECRET_KEY, STRIPE_PRICE_ID)." },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/api/stripe/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/trial-expired`,
    customer_email: user.email,
    client_reference_id: user.id,
  });

  if (!session.url) {
    return NextResponse.json({ error: "No Checkout URL returned." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
