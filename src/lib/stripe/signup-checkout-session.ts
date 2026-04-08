/**
 * Client helpers: align /auth/signup with Stripe Checkout (session_id in URL).
 * Server-side source of truth for org + pending_signups remains the Stripe webhook.
 */

export type StripeSignupSessionContext = {
  email: string;
  signupRole: "dispatcher" | "carrier";
  billingPlan: "monthly" | "yearly";
};

/**
 * Loads billing email and role/plan from a completed Checkout session (public GET).
 */
export async function fetchStripeSignupSessionContext(
  sessionId: string
): Promise<StripeSignupSessionContext> {
  const res = await fetch(
    `/api/stripe/checkout-session?session_id=${encodeURIComponent(sessionId)}`,
    { cache: "no-store" }
  );
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    email?: string;
    signupRole?: string;
    billingPlan?: string;
  };
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Invalid checkout session."
    );
  }
  const email = (data.email ?? "").trim();
  if (!email) {
    throw new Error("Checkout session has no email.");
  }
  const signupRole =
    data.signupRole === "carrier" ? "carrier" : "dispatcher";
  const billingPlan = data.billingPlan === "yearly" ? "yearly" : "monthly";
  return { email, signupRole, billingPlan };
}

/**
 * Links a completed Checkout session to the signed-in user (after signup or resubscribe).
 */
export async function attachStripeCheckoutSession(
  sessionId: string,
  accessToken: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/stripe/attach-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ session_id: sessionId }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    return {
      ok: false,
      error:
        typeof body.error === "string"
          ? body.error
          : "Could not link your subscription.",
    };
  }
  return { ok: true };
}
