import Stripe from "stripe";
import { provisionOrgForProfileFromStripeSession } from "@/lib/stripe/complete-onboarding";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

function sessionCustomerId(session: Stripe.Checkout.Session): string | null {
  const customerRaw = session.customer;
  if (typeof customerRaw === "string") return customerRaw;
  if (
    customerRaw &&
    typeof customerRaw === "object" &&
    "id" in customerRaw
  ) {
    return String((customerRaw as { id: string }).id);
  }
  return null;
}

function sessionSubscriptionId(session: Stripe.Checkout.Session): string | null {
  const subRaw = session.subscription;
  if (typeof subRaw === "string") return subRaw;
  if (
    subRaw &&
    typeof subRaw === "object" &&
    "id" in (subRaw as Stripe.Subscription)
  ) {
    return String((subRaw as Stripe.Subscription).id);
  }
  return null;
}

/**
 * Stripe-first onboarding — **webhook is source of truth** for this path:
 * runs even if the user never hits the success URL. Creates placeholder `organizations`
 * + `pending_signups` so returning to `/auth/signup?session_id=…` can attach cleanly.
 */
export async function processStripeCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe
): Promise<void> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    console.error("[stripe webhook] no service role");
    return;
  }

  if (session.status !== "complete") {
    return;
  }

  const emailRaw =
    session.customer_details?.email?.trim() ||
    session.customer_email?.trim() ||
    "";
  const email = emailRaw.toLowerCase();
  if (!email) {
    console.warn("[stripe webhook] checkout session has no email", session.id);
    return;
  }

  const meta = session.metadata ?? {};
  const isStripeFirst =
    meta.stripe_first === "true" || meta.role != null || meta.plan != null;

  if (!isStripeFirst) {
    return;
  }

  const role: "dispatcher" | "carrier" =
    meta.role === "carrier" ||
    meta.signup_role === "carrier"
      ? "carrier"
      : "dispatcher";
  const billingPlan: "monthly" | "yearly" =
    meta.plan === "yearly" || meta.billing_plan === "yearly"
      ? "yearly"
      : "monthly";

  const { data: existingRow } = await admin
    .from("pending_signups")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existingRow) {
    return;
  }

  const { data: existingUserId, error: rpcErr } = await admin.rpc(
    "auth_user_id_by_email",
    { check_email: email }
  );

  if (rpcErr) {
    console.warn("[stripe webhook] auth_user_id_by_email:", rpcErr.message);
  }

  if (existingUserId) {
    const existingUid = String(existingUserId).trim();
    if (existingUid) {
      const attached = await provisionOrgForProfileFromStripeSession(
        stripe,
        existingUid,
        session
      );
      if (!attached.ok) {
        console.error(
          "[stripe webhook] existing auth user: could not attach Stripe session:",
          attached.error,
          email
        );
      } else {
        console.info(
          "[stripe webhook] attached checkout session to existing user",
          email
        );
      }
    }
    return;
  }

  const customerId = sessionCustomerId(session);
  const subscriptionId = sessionSubscriptionId(session);

  if (session.mode === "subscription" && !subscriptionId?.trim()) {
    console.warn(
      "[stripe webhook] subscription mode but no subscription id on session",
      session.id
    );
  }

  const local = email.split("@")[0] || "User";

  let orgId: string;

  if (role === "carrier") {
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name: `${local} — Carrier (pending verification)`,
        type: "Carrier",
        dot_number: null,
        mc_number: null,
        is_active_authority: null,
      })
      .select("id")
      .single();

    if (orgErr || !org) {
      console.error("[stripe webhook] carrier org insert:", orgErr?.message);
      return;
    }
    orgId = org.id as string;
  } else {
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name: `${local} Dispatch`,
        type: "Agency",
      })
      .select("id")
      .single();

    if (orgErr || !org) {
      console.error("[stripe webhook] agency org insert:", orgErr?.message);
      return;
    }
    orgId = org.id as string;
  }

  const { error: insErr } = await admin.from("pending_signups").insert({
    stripe_checkout_session_id: session.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    email,
    role,
    billing_plan: billingPlan,
    org_id: orgId,
  });

  if (insErr) {
    console.error("[stripe webhook] pending_signups insert:", insErr.message);
  }
}
