import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

/**
 * Public: resolve a completed Checkout session for the signup form (email + metadata).
 */
export async function GET(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required." }, { status: 400 });
  }

  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });

  if (session.status !== "complete") {
    return NextResponse.json(
      { error: "Checkout is not complete yet.", status: session.status },
      { status: 409 }
    );
  }

  const email =
    session.customer_details?.email?.trim() ||
    session.customer_email?.trim() ||
    "";

  const meta = session.metadata ?? {};
  const signupRole = meta.role || meta.signup_role;
  const billingPlan = meta.plan || meta.billing_plan;

  const subRaw = session.subscription;
  const subscriptionId =
    typeof subRaw === "string"
      ? subRaw
      : subRaw &&
          typeof subRaw === "object" &&
          "id" in (subRaw as Stripe.Subscription)
        ? String((subRaw as Stripe.Subscription).id)
        : null;

  const customerRaw = session.customer;
  const customerId =
    typeof customerRaw === "string"
      ? customerRaw
      : customerRaw &&
          typeof customerRaw === "object" &&
          "id" in customerRaw
        ? String((customerRaw as { id: string }).id)
        : null;

  return NextResponse.json({
    ok: true,
    email,
    signupRole:
      signupRole === "carrier" || signupRole === "dispatcher"
        ? signupRole
        : "dispatcher",
    billingPlan: billingPlan === "yearly" ? "yearly" : "monthly",
    role:
      signupRole === "carrier" || signupRole === "dispatcher"
        ? signupRole
        : "dispatcher",
    plan: billingPlan === "yearly" ? "yearly" : "monthly",
    subscriptionId,
    customerId,
  });
}
