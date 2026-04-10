/**
 * Supabase Edge Function: discord-notifier
 *
 * Trigger: Database Webhook on `public.profiles` INSERT (configure in Dashboard → Database → Webhooks).
 * URL: https://<project-ref>.supabase.co/functions/v1/discord-notifier
 * Headers: Authorization: Bearer <SUPABASE_ANON_KEY> (or service role); JWT verify is off in config.toml.
 *
 * Secrets (Dashboard → Edge Functions → discord-notifier → Secrets):
 *   DISCORD_WEBHOOK_URL — required. Discord channel incoming webhook URL.
 *   DISCORD_NOTIFIER_SECRET — optional. If set, request must include header:
 *   x-nexus-discord-secret: <same value>
 */

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-nexus-discord-secret",
};

type DbWebhookInsert = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown>;
  old_record?: unknown;
};

function extractRecord(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as DbWebhookInsert & Record<string, unknown>;
  if (o.record && typeof o.record === "object") {
    return o.record as Record<string, unknown>;
  }
  if ("full_name" in o || "auth_email" in o || "email" in o) {
    return o as Record<string, unknown>;
  }
  return null;
}

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  return String(v).trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function discordEmbedPayload(name: string, email: string): object {
  const nameDisplay = truncate(name || "—", 500);
  const emailDisplay = truncate(email || "—", 500);
  const line = `🚀 New Signup on NexusFreight! | Name: ${nameDisplay} | Email: ${emailDisplay}`;
  return {
    embeds: [
      {
        title: "NexusFreight",
        description: truncate(line, 4096),
        color: 0x2563eb,
        footer: { text: "Database · public.profiles" },
        timestamp: new Date().toISOString(),
      },
    ],
  };
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

  const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL")?.trim();
  const isDiscordWebhook =
    !!webhookUrl &&
    (webhookUrl.startsWith("https://discord.com/api/webhooks/") ||
      webhookUrl.startsWith("https://discordapp.com/api/webhooks/"));
  if (!isDiscordWebhook) {
    return new Response(
      JSON.stringify({
        error:
          "DISCORD_WEBHOOK_URL is missing or invalid. Use a Discord incoming webhook (https://discord.com/api/webhooks/...).",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sharedSecret = Deno.env.get("DISCORD_NOTIFIER_SECRET")?.trim();
  if (sharedSecret) {
    const got = req.headers.get("x-nexus-discord-secret")?.trim();
    if (got !== sharedSecret) {
      return new Response(JSON.stringify({ error: "Forbidden." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const wh = body as DbWebhookInsert;
  if (wh.type && wh.type !== "INSERT") {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "not INSERT" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (wh.table && wh.table !== "profiles") {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "not profiles" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const record = extractRecord(body);
  if (!record) {
    return new Response(JSON.stringify({ error: "Missing record payload." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fullName = str(record.full_name) || "—";
  const email =
    str(record.auth_email) || str(record.email) || "—";

  const discordBody = discordEmbedPayload(fullName, email);

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(discordBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[discord-notifier] Discord API error:", res.status, errText.slice(0, 500));
    return new Response(
      JSON.stringify({
        error: "Discord webhook request failed.",
        status: res.status,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
