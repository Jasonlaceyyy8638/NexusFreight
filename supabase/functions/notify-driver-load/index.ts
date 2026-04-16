/// <reference path="../edge-ambient.d.ts" />
/**
 * Supabase Edge Function: notify-driver-load
 *
 * Sends Expo push notifications when a load is assigned to a driver (`loads.driver_id`).
 *
 * Trigger: Database Webhook on `public.loads` for INSERT + UPDATE.
 *   Dashboard → Database → Webhooks → Create hook
 *   - Table: public.loads
 *   - Events: Insert, Update
 *   - HTTP Request URL: https://<project-ref>.supabase.co/functions/v1/notify-driver-load
 *   - HTTP Headers: add `x-notify-driver-load-secret` = same value as Edge secret below
 *
 * Secrets (Dashboard → Edge Functions → notify-driver-load → Secrets):
 *   NOTIFY_DRIVER_LOAD_SECRET — recommended. Must match webhook header `x-notify-driver-load-secret`.
 *   If omitted, only requests with `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` are accepted.
 *
 * Deploy: `supabase functions deploy notify-driver-load`
 *
 * Note: Dashboard “Database → Replication” is for read replicas / warehouses, not this.
 * Live Map uses Postgres Realtime (publication `supabase_realtime`); configure under Database → Publications or your project’s Realtime settings if a table toggle exists.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-notify-driver-load-secret",
};

const EXPO_PUSH_MAX_PER_REQUEST = 100;

type DbWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown> | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  return String(v).trim();
}

function authorize(req: Request): boolean {
  const shared = Deno.env.get("NOTIFY_DRIVER_LOAD_SECRET")?.trim();
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (shared) {
    return req.headers.get("x-notify-driver-load-secret")?.trim() === shared;
  }
  if (sr) {
    const auth = req.headers.get("authorization")?.trim();
    return auth === `Bearer ${sr}`;
  }
  return true;
}

function shouldNotifyLoadAssign(
  type: string | undefined,
  record: Record<string, unknown>,
  oldRecord: Record<string, unknown> | null | undefined
): boolean {
  const driverId = str(record.driver_id);
  if (!driverId) return false;

  if (type === "INSERT") return true;

  if (type === "UPDATE") {
    const prev = oldRecord ? str(oldRecord.driver_id) : "";
    return prev !== driverId;
  }

  return false;
}

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound?: string;
  channelId?: string;
  data?: Record<string, string>;
};

function normalizeTickets(data: unknown): Array<{ status?: string }> {
  if (data == null) return [];
  if (Array.isArray(data)) return data as { status?: string }[];
  if (typeof data === "object") return [data as { status?: string }];
  return [];
}

async function sendExpoBatch(messages: ExpoPushMessage[]): Promise<{
  ok: boolean;
  status: number;
  detail?: string;
}> {
  if (messages.length === 0) {
    return { ok: true, status: 200 };
  }
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, detail: text.slice(0, 800) };
  }
  try {
    const parsed = JSON.parse(text) as { data?: unknown };
    const tickets = normalizeTickets(parsed.data);
    const errors = tickets.filter((d) => d.status === "error");
    if (errors.length > 0) {
      return {
        ok: false,
        status: 502,
        detail: `Expo reported ${errors.length} ticket error(s).`,
      };
    }
  } catch {
    /* ignore parse */
  }
  return { ok: true, status: 200 };
}

async function sendAllExpoPushes(messages: ExpoPushMessage[]): Promise<{
  ok: boolean;
  status: number;
  detail?: string;
}> {
  for (let i = 0; i < messages.length; i += EXPO_PUSH_MAX_PER_REQUEST) {
    const slice = messages.slice(i, i + EXPO_PUSH_MAX_PER_REQUEST);
    const r = await sendExpoBatch(slice);
    if (!r.ok) return r;
  }
  return { ok: true, status: 200 };
}

async function notifyByLoadId(
  supabase: ReturnType<typeof createClient>,
  loadId: string
): Promise<Response> {
  const { data: load, error } = await supabase
    .from("loads")
    .select("id, driver_id, origin, destination, status")
    .eq("id", loadId)
    .maybeSingle();

  if (error || !load) {
    return json({ error: "Load not found.", detail: error?.message }, 404);
  }

  const driverId = str(load.driver_id);
  if (!driverId) {
    return json({ ok: true, skipped: true, reason: "no_driver_id" });
  }

  const { data: tokens, error: tokErr } = await supabase
    .from("driver_push_tokens")
    .select("expo_push_token")
    .eq("driver_id", driverId);

  if (tokErr) {
    return json({ error: "Failed to read push tokens.", detail: tokErr.message }, 500);
  }

  const rows = (tokens ?? []) as { expo_push_token: string }[];
  if (rows.length === 0) {
    return json({ ok: true, skipped: true, reason: "no_expo_tokens", loadId, driverId });
  }

  const origin = str(load.origin) || "Pickup";
  const dest = str(load.destination) || "Delivery";
  const messages: ExpoPushMessage[] = rows.map((r) => ({
    to: r.expo_push_token,
    title: "New load assigned",
    body: `${origin} → ${dest}`,
    sound: "default",
    channelId: "loads",
    data: { loadId: str(load.id) },
  }));

  const push = await sendAllExpoPushes(messages);
  if (!push.ok) {
    console.error("[notify-driver-load] Expo error:", push.detail);
    return json(
      { error: "Expo push failed.", status: push.status, detail: push.detail },
      502
    );
  }

  return json({ ok: true, sent: messages.length, loadId: load.id, driverId });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!authorize(req)) {
    return json({ error: "Forbidden." }, 403);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const wh = body as DbWebhookPayload & { loadId?: string };
  const supabase = createClient(supabaseUrl, serviceKey);

  if (typeof wh.loadId === "string" && wh.loadId.trim()) {
    return notifyByLoadId(supabase, wh.loadId.trim());
  }

  if (wh.table && wh.table !== "loads") {
    return json({ ok: true, skipped: true, reason: "not loads table" });
  }

  const record = wh.record;
  if (!record || typeof record !== "object") {
    return json({ error: "Missing webhook record." }, 400);
  }

  if (!shouldNotifyLoadAssign(wh.type, record, wh.old_record ?? null)) {
    return json({ ok: true, skipped: true, reason: "no_driver_assignment_change" });
  }

  const loadId = str(record.id);
  if (!loadId) {
    return json({ error: "Missing load id in record." }, 400);
  }

  return notifyByLoadId(supabase, loadId);
});
