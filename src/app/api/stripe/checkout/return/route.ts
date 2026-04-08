import { NextResponse } from "next/server";
import Stripe from "stripe";
import { completeStripeOnboardingFromSession } from "@/lib/stripe/complete-onboarding";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

  if (!sessionId || !secret) {
    return NextResponse.redirect(`${origin}/trial-expired`);
  }

  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });

  if (session.status === "complete") {
    await completeStripeOnboardingFromSession(session, stripe);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
