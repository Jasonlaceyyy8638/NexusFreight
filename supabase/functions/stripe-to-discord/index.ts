/**
 * Supabase Edge Function: stripe-to-discord
 *
 * Stripe → HTTP webhook (this URL) → Discord revenue alert.
 *
 * 1. In Stripe Dashboard → Developers → Webhooks → Add endpoint:
 *    URL: https://<project-ref>.supabase.co/functions/v1/stripe-to-discord
 *    Events: checkout.session.completed
 *    Copy the endpoint's **Signing secret** (whsec_...).
 *
 * 2. Supabase Dashboard → Edge Functions → stripe-to-discord → Secrets:
 *    - DISCORD_REVENUE_WEBHOOK_URL — Discord incoming webhook URL
 *    - STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SIGNING_SECRET — whsec_… for **this** endpoint only
 *    - STRIPE_SECRET_KEY — Same restricted key you use on the server (constructEvent runs on the Stripe client)
 *
 * Deploy: npx supabase functions deploy stripe-to-discord
 */

import Stripe from "https://esm.sh/stripe@22.0.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/** Metallic gold for Discord embed (0xD4AF37). */
const EMBED_GOLD = 0xd4af37;

function isDiscordWebhookUrl(url: string): boolean {
  return (
    url.startsWith("https://discord.com/api/webhooks/") ||
    url.startsWith("https://discordapp.com/api/webhooks/")
  );
}

function formatPaymentLine(
  amountTotal: number | null,
  currency: string | null
): string {
  if (amountTotal == null) {
    return "Amount (see Stripe dashboard — session had no total)";
  }
  const cur = (currency || "usd").toLowerCase();
  const major = amountTotal / 100;
  if (cur === "usd") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(major);
  }
  return `${major.toFixed(2)} ${cur.toUpperCase()}`;
}

function customerEmailFromSession(session: Stripe.Checkout.Session): string {
  const direct = session.customer_email?.trim();
  if (direct) return direct;
  const details = session.customer_details;
  const em =
    typeof details?.email === "string" ? details.email.trim() : "";
  if (em) return em;
  return "—";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const webhookSecret =
    Deno.env.get("STRIPE_WEBHOOK_SECRET")?.trim() ||
    Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET")?.trim();
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  const discordUrl = Deno.env.get("DISCORD_REVENUE_WEBHOOK_URL")?.trim();

  if (!stripeSecretKey || !stripeSecretKey.startsWith("sk_")) {
    return new Response(
      JSON.stringify({
        error:
          "STRIPE_SECRET_KEY is missing or invalid (restricted key, sk_…).",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
    return new Response(
      JSON.stringify({
        error:
          "STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SIGNING_SECRET is missing or invalid (expected whsec_… for this Stripe endpoint).",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!discordUrl || !isDiscordWebhookUrl(discordUrl)) {
    return new Response(
      JSON.stringify({
        error:
          "DISCORD_REVENUE_WEBHOOK_URL is missing or not a valid Discord webhook URL.",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing Stripe-Signature." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();

  const stripe = new Stripe(stripeSecretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (e) {
    console.error("[stripe-to-discord] signature verification failed:", e);
    return new Response(JSON.stringify({ error: "Invalid Stripe signature." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.mode === "setup") {
    return new Response(JSON.stringify({ received: true, skipped: "setup mode" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const amountLine = formatPaymentLine(
    session.amount_total ?? null,
    session.currency ?? null
  );
  const email = customerEmailFromSession(session);

  const payload = {
    embeds: [
      {
        title: "💰 New Revenue Secured!",
        description: `A payment of **${amountLine}** was just processed for **${email}**.`,
        color: EMBED_GOLD,
        footer: { text: "NexusFreight Revenue Engine" },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const dr = await fetch(discordUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!dr.ok) {
    const t = await dr.text();
    console.error("[stripe-to-discord] Discord error:", dr.status, t.slice(0, 400));
    return new Response(
      JSON.stringify({ error: "Discord webhook failed.", status: dr.status }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
