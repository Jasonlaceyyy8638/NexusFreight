import Stripe from "stripe";
import {
  sendSubscriptionEndedEmail,
  subscriptionEndedEmailConfigured,
} from "@/lib/email/send-subscription-ended-email";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { ACCESS_GRANTING_STATUSES } from "@/lib/stripe/subscription-access";

function customerIdFromSubscription(sub: Stripe.Subscription): string | null {
  const c = sub.customer;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "id" in c) {
    return String((c as Stripe.Customer).id);
  }
  return null;
}

const TERMINAL_FOR_EMAIL = new Set([
  "canceled",
  "unpaid",
  "incomplete_expired",
  "paused",
]);

function previouslyHadAccess(status: string | null | undefined): boolean {
  const s = status?.trim().toLowerCase() ?? "";
  if (!s) return true;
  return ACCESS_GRANTING_STATUSES.has(s);
}

/**
 * Stripe `customer.subscription.updated` and `customer.subscription.deleted`.
 * Updates profiles.stripe_subscription_status; sends one resubscribe email when access ends.
 */
export async function processSubscriptionWebhookEvent(
  subscription: Stripe.Subscription
): Promise<void> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    console.error("[stripe subscription webhook] no service role");
    return;
  }

  const subId = subscription.id;
  const status = subscription.status;
  const customerId = customerIdFromSubscription(subscription);

  const { data: bySub } = await admin
    .from("profiles")
    .select(
      "id, stripe_subscription_status, subscription_ended_email_sent_at, full_name"
    )
    .eq("stripe_subscription_id", subId);

  let rows =
    (bySub as Array<{
      id: string;
      stripe_subscription_status: string | null;
      subscription_ended_email_sent_at: string | null;
      full_name: string | null;
    }>) ?? [];

  if (!rows.length && customerId) {
    const { data: byCust } = await admin
      .from("profiles")
      .select(
        "id, stripe_subscription_status, subscription_ended_email_sent_at, full_name"
      )
      .eq("stripe_customer_id", customerId);
    rows =
      (byCust as Array<{
        id: string;
        stripe_subscription_status: string | null;
        subscription_ended_email_sent_at: string | null;
        full_name: string | null;
      }>) ?? [];
  }

  if (!rows.length) {
    return;
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  for (const row of rows) {
    const prev = row.stripe_subscription_status;
    const patch: Record<string, unknown> = {
      stripe_subscription_status: status,
      updated_at: new Date().toISOString(),
    };
    if (status === "active" || status === "trialing") {
      patch.subscription_ended_email_sent_at = null;
    }

    await admin.from("profiles").update(patch).eq("id", row.id);

    const lostAccess =
      TERMINAL_FOR_EMAIL.has(status) &&
      previouslyHadAccess(prev) &&
      !row.subscription_ended_email_sent_at;

    if (!lostAccess || !subscriptionEndedEmailConfigured()) {
      continue;
    }

    const { data: authUser } = await admin.auth.admin.getUserById(row.id);
    const email = authUser.user?.email?.trim();
    if (!email) continue;

    const displayName =
      row.full_name?.trim() || email.split("@")[0] || "there";

    try {
      await sendSubscriptionEndedEmail({
        to: email,
        displayName,
        origin,
      });
      await admin
        .from("profiles")
        .update({
          subscription_ended_email_sent_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    } catch (e) {
      console.error("[stripe subscription webhook] email:", e);
    }
  }
}
