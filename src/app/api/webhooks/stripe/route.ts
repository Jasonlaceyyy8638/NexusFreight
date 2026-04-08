import { NextResponse } from "next/server";
import Stripe from "stripe";
import { completeStripeOnboardingFromSession } from "@/lib/stripe/complete-onboarding";
import { processStripeCheckoutSessionCompleted } from "@/lib/stripe/process-checkout-session-webhook";
import { processSubscriptionWebhookEvent } from "@/lib/stripe/process-subscription-webhook";

export const runtime = "nodejs";

/**
 * Stripe webhook — configure endpoint in Dashboard: /api/webhooks/stripe
 *
 * **Source of truth for Stripe-first onboarding:** `checkout.session.completed`
 * runs server-side as soon as payment succeeds. Even if the browser never opens
 * the success URL, `processStripeCheckoutSessionCompleted` creates the
 * placeholder `organizations` row + `pending_signups` (and legacy
 * `completeStripeOnboardingFromSession` when `client_reference_id` is set).
 *
 * Required events: `checkout.session.completed`,
 * `customer.subscription.updated`, `customer.subscription.deleted`
 * (add `customer.subscription.created` if you want faster status sync).
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret || !key) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = new Stripe(key);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    console.error("[webhooks/stripe] signature:", e);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    // Expand so customer/subscription ids resolve from objects or strings reliably.
    const expanded = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["subscription", "customer"],
    });

    // Stripe-first: pending_signups + placeholder org until signup attaches profile.
    // Legacy: client_reference_id = Supabase user id → provision profile immediately.
    await processStripeCheckoutSessionCompleted(expanded, stripe);

    const legacy = await completeStripeOnboardingFromSession(expanded, stripe);
    if (!legacy.ok) {
      console.error("[webhooks/stripe] legacy onboarding:", legacy.error);
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    await processSubscriptionWebhookEvent(sub);
  }

  return NextResponse.json({ received: true });
}
