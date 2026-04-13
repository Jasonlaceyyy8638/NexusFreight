/// <reference path="../edge-ambient.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Match `automated-market-pulse` (Gemini via Google AI Studio). */
const GEMINI_MODEL_ID = "gemini-3.1-flash-lite-preview";

function geminiUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent?key=${apiKey}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]);
    }
  }
  return btoa(binary);
}

function extMime(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/pdf";
}

function extractJsonText(raw: string): string {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) return fence[1].trim();
  return t;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const googleKey = Deno.env.get("GOOGLE_AI_API_KEY")?.trim();

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "Supabase environment is not configured." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Sign in required." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { storagePath?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const storagePath = typeof body.storagePath === "string" ? body.storagePath.trim() : "";
  if (!storagePath || storagePath.includes("..")) {
    return new Response(JSON.stringify({ error: "storagePath is required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Invalid session." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: profile, error: profErr } = await userClient
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr || !profile?.org_id) {
    return new Response(JSON.stringify({ error: "Profile not found." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const orgFolder = storagePath.split("/")[0];
  if (orgFolder !== profile.org_id) {
    return new Response(JSON.stringify({ error: "Storage path does not match your organization." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const service = createClient(supabaseUrl, serviceKey);
  const { data: blob, error: dlErr } = await service.storage
    .from("ratecons")
    .download(storagePath);

  if (dlErr || !blob) {
    return new Response(
      JSON.stringify({ error: dlErr?.message ?? "Could not read uploaded file." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const buf = new Uint8Array(await blob.arrayBuffer());
  if (buf.byteLength > 20 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: "File too large (max 20 MB)." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!googleKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_AI_API_KEY is not configured for this project." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const mime = extMime(storagePath);
  const b64 = bytesToBase64(buf);

  const prompt = `You are parsing a freight trucking Rate Confirmation document.
Extract structured data for dispatch. Return ONLY valid JSON (no markdown) with this exact shape and keys:
{
  "pickup": {
    "locationName": string,
    "address": string,
    "date": string | null,
    "timeWindow": string
  },
  "delivery": {
    "locationName": string,
    "address": string,
    "date": string | null,
    "timeWindow": string
  },
  "commodities": string,
  "weightLbs": number | null,
  "specialInstructions": string,
  "totalRateUsd": number | null
}

Rules:
- Dates as YYYY-MM-DD when you can infer a calendar date; otherwise null.
- timeWindow: e.g. "08:00-12:00" or "FCFS" or free text from the document.
- commodities: cargo description.
- weightLbs: total weight as a number (pounds) if stated.
- specialInstructions: accessorials, temp, seals, notes for the driver — combine multiple bullet ideas with semicolons.
- totalRateUsd: the total carrier pay / linehaul in US dollars (not per mile) if clearly stated; otherwise null.
- If a field is unknown, use empty string for strings or null for numbers/dates.`;

  const geminiBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mime,
              data: b64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
    },
  };

  const gRes = await fetch(geminiUrl(googleKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody),
  });

  if (!gRes.ok) {
    const errText = await gRes.text().catch(() => "");
    console.error("[ratecon-parse] Gemini HTTP", gRes.status, errText.slice(0, 500));
    return new Response(
      JSON.stringify({ error: "Document parsing failed. Try a clearer PDF or image." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const gJson = (await gRes.json()) as Record<string, unknown>;
  const candidates = gJson.candidates as Record<string, unknown>[] | undefined;
  const content = candidates?.[0]?.content as Record<string, unknown> | undefined;
  const parts = content?.parts as Record<string, unknown>[] | undefined;
  const text =
    typeof parts?.[0]?.text === "string" ? (parts[0].text as string) : "";

  if (!text.trim()) {
    return new Response(JSON.stringify({ error: "No structured output from model." }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(text));
  } catch {
    return new Response(JSON.stringify({ error: "Model returned invalid JSON." }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ parsed, model: GEMINI_MODEL_ID }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
