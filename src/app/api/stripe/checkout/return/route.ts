import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

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
    expand: ["subscription"],
  });

  const userId = session.client_reference_id;
  const sub = session.subscription;
  const subId =
    typeof sub === "string"
      ? sub
      : sub && typeof sub === "object" && "id" in sub
        ? String((sub as { id: string }).id)
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

  if (userId && subId && session.status === "complete") {
    const admin = createServiceRoleSupabaseClient();
    if (admin) {
      await admin
        .from("profiles")
        .update({
          stripe_subscription_id: subId,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
