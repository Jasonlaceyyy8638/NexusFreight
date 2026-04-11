/// <reference path="../edge-ambient.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Production: `false` — Resend to `profiles.auth_email` only. Set `true` for test inbox only. */
const IS_TEST_MODE = false;
/** Quiet mode: pulse email recipient only (no profile blast). */
const MARKET_PULSE_TEST_EMAIL = "jasonlaceyyy8638@gmail.com";

/** DAT Trendlines — primary HTML scrape target (industry-standard public page). */
const DAT_TRENDLINES_URL = "https://www.dat.com/trendlines/";

/** Stored on `market_rates.source` and used for pro-tip routing; neutral (no vendor/model names in product UI or email). */
const PULSE_SOURCE_PUBLISHED = "NexusFreight market pulse";

/** Gemini model id (AI Studio / v1beta `generateContent`). */
const GEMINI_FLASH_MODEL_ID = "gemini-3.1-flash-lite-preview";

function geminiGenerateContentUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH_MODEL_ID}:generateContent?key=${apiKey}`;
}

/**
 * When Gemini HTTP errors (429/500), fetch throws, or no usable text — never throws upstream.
 */
const GEMINI_FALLBACK_PRO_TIP =
  "Market conditions remain steady; ensure you are quoting based on current spot benchmarks.";

/** Expedite / cargo-van tier in DB column `sprinter` (equipment `cargo_van`). Dashboard "Sprinter" card uses `power_only`. */
const EXPEDITE_MAX_USD = 1.45;
/** When expedite tier exceeds `EXPEDITE_MAX_USD`, snap to this (production guardrail). */
const EXPEDITE_CLAMP_USD = 1.4;
/** UI "Sprinter" (`power_only`) tracks cargo-van tier with a small uplift. */
const POWER_ONLY_ABOVE_CARGO_VAN = 0.05;

const BOX_TRUCK_LO = 1.7;
const BOX_TRUCK_HI = 2.1;
const BOX_TRUCK_FALLBACK = 1.85;

type MarketRow = {
  van_dry: number;
  reefer: number;
  flatbed: number;
  box_truck: number;
  sprinter: number;
  power_only: number;
  source: string;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Sync Step: `sprinter` holds the cargo-van / expedite benchmark; `power_only` is the dashboard "Sprinter" card
 * and must track that tier (not dry-van-derived linehaul). Hard clamps for expedite ceiling and box band.
 */
function applyExpediteSyncBoxClamp(derived: Omit<MarketRow, "source">): void {
  let cargoVan = derived.sprinter;
  if (!Number.isFinite(cargoVan) || cargoVan <= 0) cargoVan = 1.3;
  if (cargoVan > EXPEDITE_MAX_USD) cargoVan = EXPEDITE_CLAMP_USD;
  derived.sprinter = round4(cargoVan);

  derived.power_only = round4(derived.sprinter + POWER_ONLY_ABOVE_CARGO_VAN);

  let box = derived.box_truck;
  if (!Number.isFinite(box) || box < BOX_TRUCK_LO || box > BOX_TRUCK_HI) {
    box = BOX_TRUCK_FALLBACK;
  }
  derived.box_truck = round4(box);

  if (derived.box_truck <= derived.sprinter) {
    derived.box_truck = round4(
      clamp(derived.sprinter + 0.35, BOX_TRUCK_LO, BOX_TRUCK_HI)
    );
  }
}

/** UTC `YYYY-MM-DD` — aligns with Postgres `CURRENT_DATE` when the session timezone is UTC. */
function utcCalendarDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildEquipmentRateUpserts(params: {
  derived: Omit<MarketRow, "source">;
  source: string;
  pro_tip: string;
  asOf: string;
}): Array<{
  equipment_type: string;
  usd_per_mile: number;
  as_of: string;
  source: string;
  pro_tip: string | null;
  updated_at: string;
}> {
  const { derived, source, pro_tip, asOf } = params;
  const base = { as_of: asOf, source, updated_at: asOf };
  return [
    { equipment_type: "dry_van", usd_per_mile: derived.van_dry, ...base, pro_tip },
    { equipment_type: "reefer", usd_per_mile: derived.reefer, ...base, pro_tip: null },
    { equipment_type: "flatbed", usd_per_mile: derived.flatbed, ...base, pro_tip: null },
    { equipment_type: "box_truck", usd_per_mile: derived.box_truck, ...base, pro_tip: null },
    { equipment_type: "cargo_van", usd_per_mile: derived.sprinter, ...base, pro_tip: null },
    { equipment_type: "power_only", usd_per_mile: derived.power_only, ...base, pro_tip: null },
  ];
}

function normKey(s: string): string {
  return s.trim().replace(/[\u200b\u00a0]/g, "");
}

/** Optional JSON feed from a public freight index URL you host or trust. */
async function tryJsonFeed(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, unknown>;
    const v = Number(
      j.dryVan ??
        j.van ??
        j.spotDryVan ??
        j.dry_van ??
        j.national_dry_van ??
        j.nationalAverageDryVanPerMile ??
        j.national_dry_van_usd_per_mile ??
        j.linehaulVan ??
        j.value ??
        j.rate
    );
    if (Number.isFinite(v) && v > 0.4 && v < 25) return v;
    const obs = j.observations;
    if (Array.isArray(obs) && obs.length > 0) {
      const last = obs[obs.length - 1] as Record<string, unknown>;
      const ov = Number(last?.value ?? last?.rate);
      if (Number.isFinite(ov) && ov > 0.4 && ov < 25) return ov;
    }
    const data = j.data;
    if (Array.isArray(data) && data.length > 0) {
      const row = data[data.length - 1] as Record<string, unknown>;
      const dv = Number(row?.dryVan ?? row?.van ?? row?.value ?? row?.rate);
      if (Number.isFinite(dv) && dv > 0.4 && dv < 25) return dv;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * ScraperAPI standard fetch (no `premium` / `ultra_premium` — avoids trial 403s).
 * Renders JS + US geo; homepage text goes straight to Gemini.
 */
function buildScraperApiTextFetchUrl(key: string, targetUrl: string): string {
  const enc = encodeURIComponent(targetUrl.trim());
  return (
    `https://api.scraperapi.com/?api_key=${key}&url=${enc}` +
    `&render=true&country_code=us`
  );
}

function maskScraperApiKeyInUrl(scraperUrl: string): string {
  return scraperUrl.replace(/api_key=[^&]+/, "api_key=***MASKED***");
}

const NEWS_TEXT_MAX_CHARS = 65_000;

/**
 * Fetches raw page text (HTML as text) for AI analyst. Uses `SCRAPER_API_KEY` when set (no custom headers to ScraperAPI).
 */
async function fetchNewsPageText(url: string): Promise<string | null> {
  const key = Deno.env.get("SCRAPER_API_KEY")?.trim();
  const viaProxy = Boolean(key);
  const t = url.trim();

  try {
    const fetchUrl = key ? buildScraperApiTextFetchUrl(key, t) : t;
    if (viaProxy) {
      console.log('Final Scraper URL:', maskScraperApiKeyInUrl(fetchUrl));
      console.log(`[fetchNewsPageText] target=${t.slice(0, 160)}`);
    }

    const init: RequestInit = {
      signal: AbortSignal.timeout(viaProxy ? 60_000 : 25_000),
    };
    if (!viaProxy) {
      init.headers = {
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; NexusFreightMarketPulse/1.0; +https://nexusfreight.tech)",
      };
    }

    const res = await fetch(fetchUrl, init);
    if (!res.ok) {
      const err = await res.text();
      console.error(
        `[fetchNewsPageText] HTTP ${res.status} target=${t.slice(0, 120)}`,
        err.slice(0, 1500)
      );
      return null;
    }
    const body = await res.text();
    const slice = body.slice(0, NEWS_TEXT_MAX_CHARS);
    console.log(`[fetchNewsPageText] ok chars=${body.length} truncated=${slice.length}`);
    return slice;
  } catch (e) {
    console.error(
      `[fetchNewsPageText] exception target=${t.slice(0, 120)}`,
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}

type MarketAnalystResult = {
  row: Omit<MarketRow, "source">;
  pro_tip: string;
};

/**
 * DAT Trendlines homepage text only (ScraperAPI standard fetch) → Gemini multi-equipment JSON + `pro_tip`.
 */
async function marketAnalyst(params: {
  datHomepageText: string | null;
}): Promise<MarketAnalystResult | null> {
  try {
    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY")?.trim();
    if (!apiKey) return null;

    const page = (params.datHomepageText ?? "").slice(0, NEWS_TEXT_MAX_CHARS);
    if (!page.trim()) {
      console.log("[marketAnalyst] no DAT homepage text; skipping analyst call.");
      return null;
    }

    const prompt =
      `You are a logistics expert for NexusFreight's morning Market Pulse.\n` +
      `From the DAT Trendlines page text below, infer **national spot linehaul** rates in USD per loaded mile.\n\n` +
      `**Strict value hierarchy (highest $/mi → lowest)** — every number you output must respect this order:\n` +
      `Reefer > Flatbed > Dry Van > Box Truck (26ft) > Sprinter/Cargo Van.\n\n` +
      `**Jason guardrails** (the server clamps JSON that drifts):\n\n` +
      `**Strict output ranges (your JSON must comply):** Sprinter/Cargo Van **$1.15–$1.45**/mi · Box Truck (26ft) **$1.70–$2.10**/mi.\n\n` +
      `Dry Van: From DAT/news when possible; national dry van typically **$2.30–$2.50**/mi.\n\n` +
      `Reefer: **$0.40–$0.60** above the Dry Van rate you output.\n\n` +
      `Flatbed: **$0.20–$0.40** above the Dry Van rate you output.\n\n` +
      `Box Truck (26ft): Approximately **$1.70–$2.10**/mi. It must **always** be higher than Sprinter/Cargo Van.\n\n` +
      `Sprinter / Cargo Van (expedite): **$1.15–$1.45**/mi — not scaled off Dry Van; never above **$1.50**/mi.\n\n` +
      `If the page text clearly states different vetted figures, prefer the text; otherwise apply the guardrails.\n\n` +
      `Reply with JSON only, matching this exact shape (no markdown, no extra keys):\n` +
      `{ "van": number, "reefer": number, "flatbed": number, "sprinter": number, "boxtruck": number, "pro_tip": "string" }\n` +
      `Use one clear sentence for pro_tip (max ~40 words).\n\n` +
      `--- Page text (DAT Trendlines homepage) ---\n${page}`;

    const pulseJsonSchema = {
      type: "object",
      properties: {
        van: {
          type: "number",
          description:
            "National dry van spot USD/mi from DAT context; typically ~2.30–2.50.",
        },
        reefer: {
          type: "number",
          description: "National reefer USD/mi; $0.40–0.60 above dry van.",
        },
        flatbed: {
          type: "number",
          description: "National flatbed USD/mi; $0.20–0.40 above dry van.",
        },
        sprinter: {
          type: "number",
          description:
            "Sprinter/cargo van USD/mi; strict $1.15–$1.45, never above $1.50.",
        },
        boxtruck: {
          type: "number",
          description:
            "26ft box truck USD/mi; strict $1.70–$2.10, always above sprinter, below dry van.",
        },
        pro_tip: {
          type: "string",
          description: "One sentence actionable tip for dispatchers.",
        },
      },
      required: ["van", "reefer", "flatbed", "sprinter", "boxtruck", "pro_tip"],
    } as const;

    const genUrl = geminiGenerateContentUrl(apiKey);
    const res = await fetch(genUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.24,
          topP: 0.88,
          responseMimeType: "application/json",
          responseJsonSchema: pulseJsonSchema,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error("[marketAnalyst] HTTP", res.status, raw.slice(0, 800));
      return null;
    }
    let outer: Record<string, unknown>;
    try {
      outer = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
    const cands = outer.candidates as unknown[] | undefined;
    const first = cands?.[0] as Record<string, unknown> | undefined;
    const content = first?.content as Record<string, unknown> | undefined;
    const parts = content?.parts as unknown[] | undefined;
    const part0 = parts?.[0] as Record<string, unknown> | undefined;
    const text = part0?.text;
    if (typeof text !== "string" || !text.trim()) return null;

    const trimmed = text.trim();
    let j: Record<string, unknown>;
    try {
      j = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      const blob = trimmed.match(/\{[\s\S]*\}/);
      if (!blob) return null;
      try {
        j = JSON.parse(blob[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }

    console.log("[marketAnalyst] parsed JSON:", JSON.stringify(j));

    const pick = (...keys: string[]): number => {
      for (const k of keys) {
        const v = Number(j[k]);
        if (Number.isFinite(v) && v > 0.35 && v < 25) return v;
      }
      return NaN;
    };

    const vanRaw = pick("van", "dryVan", "dry_van", "van_dry");
    if (!Number.isFinite(vanRaw)) return null;

    let reefer = pick("reefer");
    let flatbed = pick("flatbed");
    const cargo_van = pick("cargo_van", "cargoVan", "cargoVanUsd", "cargovan");
    let spr = pick("sprinter", "cargoVan", "cargo_van");
    if (Number.isFinite(cargo_van)) {
      spr = cargo_van;
    }
    let box = pick("boxtruck", "box_truck", "boxTruck");

    if (!Number.isFinite(reefer)) reefer = vanRaw + 0.5;
    if (!Number.isFinite(flatbed)) flatbed = vanRaw + 0.3;
    if (!Number.isFinite(spr)) spr = 1.3;
    if (!Number.isFinite(box)) box = 1.9;

    const VAN_LO = 2.3;
    const VAN_HI = 2.5;
    const BOX_LO = 1.7;
    const BOX_HI = 2.1;
    const SPR_LO = 1.15;
    const SPR_HI = 1.45;
    const SPR_HARD_MAX = 1.5;

    let van = round4(clamp(vanRaw, VAN_LO, VAN_HI));
    reefer = round4(clamp(reefer, van + 0.4, van + 0.6));
    flatbed = round4(clamp(flatbed, van + 0.2, van + 0.4));

    if (reefer <= flatbed) {
      reefer = round4(Math.min(van + 0.6, flatbed + 0.12));
    }

    box = round4(clamp(box, BOX_LO, BOX_HI));
    spr = round4(Math.min(clamp(spr, SPR_LO, SPR_HI), SPR_HARD_MAX));

    if (box >= van) {
      box = round4(clamp(van - 0.45, BOX_LO, BOX_HI));
    }

    if (spr > box) {
      const sprBefore = spr;
      spr = round4(box * 0.75);
      console.log(
        "[marketAnalyst] sanity: sprinter > boxtruck; sprinter = boxtruck * 0.75",
        { boxtruck: box, sprinterBefore: sprBefore, sprinterAfter: spr }
      );
    }
    spr = round4(Math.min(clamp(spr, SPR_LO, SPR_HI), SPR_HARD_MAX));

    if (box <= spr) {
      box = round4(clamp(spr + 0.32, BOX_LO, BOX_HI));
      if (box >= van) {
        box = round4(clamp(van - 0.45, BOX_LO, BOX_HI));
      }
      console.log("[marketAnalyst] sanity: enforced boxtruck > sprinter", {
        boxtruck: box,
        sprinter: spr,
      });
    }

    if (spr > EXPEDITE_MAX_USD) {
      spr = EXPEDITE_CLAMP_USD;
    }

    console.log(
      "[marketAnalyst] Jason guardrails — final rates (USD/mi):",
      JSON.stringify({
        van_dry: van,
        reefer,
        flatbed,
        box_truck: box,
        sprinter: spr,
      })
    );

    const rawTip = j.pro_tip ?? j.proTip;
    const pro_tip = typeof rawTip === "string" && rawTip.trim()
      ? sanitizeOneSentenceGemini(rawTip)
      : GEMINI_FALLBACK_PRO_TIP;

    const row: Omit<MarketRow, "source"> = {
      van_dry: round4(van),
      reefer: round4(reefer),
      flatbed: round4(flatbed),
      box_truck: round4(box),
      sprinter: round4(spr),
      power_only: 0,
    };
    applyExpediteSyncBoxClamp(row);

    return { row, pro_tip };
  } catch (e) {
    console.error("[marketAnalyst]", e instanceof Error ? e.message : String(e));
    return null;
  }
}

function fallbackDefaultVan(): { usdPerMile: number; source: string } {
  const fallback = parseFloat(
    Deno.env.get("MARKET_PULSE_FALLBACK_VAN_USD_MI")?.trim() || "2.42"
  );
  return {
    usdPerMile: round4(
      Number.isFinite(fallback) && fallback > 0.4 ? fallback : 2.42
    ),
    source: "fallback_default",
  };
}

/**
 * When no live scrape/index rate exists, asks Gemini for a plausible dry-van $/mi from date + trends.
 * Returns null on any failure (caller uses flat fallback_default).
 */
async function geminiGuessDryVanSpotUsdPerMile(params: {
  prevVan: number | null;
}): Promise<number | null> {
  try {
    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY")?.trim();
    if (!apiKey) return null;

    const dateLabel = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Chicago",
    });

    const prevLine =
      params.prevVan != null && params.prevVan > 0
        ? `Last saved pulse dry-van in our DB: $${params.prevVan.toFixed(2)}/mi (anchor if still plausible).`
        : "No prior saved dry-van benchmark in our database.";

    const prompt =
      `You are a US truckload freight analyst. Our live DAT trendlines text fetch or multi-equipment analyst path did not yield a row for today's automated pulse.\n` +
      `Calendar date (America/Chicago): ${dateLabel}.\n` +
      `${prevLine}\n` +
      `From typical seasonality, diesel exposure, and historical national dry-van spot ranges, output ONE plausible **national dry-van spot linehaul** in USD per mile for today. Stay between 1.25 and 4.00.\n` +
      `Reply with ONLY valid JSON, no markdown, no other text: {"dryVanUsdPerMile":<number>}`;

    const genUrl = geminiGenerateContentUrl(apiKey);

    const res = await fetch(genUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 128,
          temperature: 0.38,
          topP: 0.88,
        },
      }),
      signal: AbortSignal.timeout(28_000),
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error(
        "[geminiGuessDryVanSpotUsdPerMile] HTTP",
        res.status,
        raw.slice(0, 600)
      );
      return null;
    }

    let outer: Record<string, unknown>;
    try {
      outer = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }

    const cands = outer.candidates as unknown[] | undefined;
    const first = cands?.[0] as Record<string, unknown> | undefined;
    const content = first?.content as Record<string, unknown> | undefined;
    const parts = content?.parts as unknown[] | undefined;
    const part0 = parts?.[0] as Record<string, unknown> | undefined;
    const text = part0?.text;
    if (typeof text !== "string" || !text.trim()) return null;

    const jsonBlob = text.trim().match(/\{[\s\S]*\}/);
    if (!jsonBlob) return null;
    let inner: Record<string, unknown>;
    try {
      inner = JSON.parse(jsonBlob[0]) as Record<string, unknown>;
    } catch {
      return null;
    }

    const n = Number(inner.dryVanUsdPerMile ?? inner.dry_van_usd_per_mile ?? inner.rate);
    if (!Number.isFinite(n) || n < 0.4 || n > 25) return null;
    return round4(n);
  } catch (e) {
    console.error(
      "[geminiGuessDryVanSpotUsdPerMile] error:",
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}

type PulseResolution = {
  pulse: MarketRow;
  analystProTip: string | null;
};

async function resolvePulseMarketRates(
  prevVan: number | null = null
): Promise<PulseResolution> {
  const fromVan = (usdPerMile: number, source: string): PulseResolution => {
    const d = deriveRates(usdPerMile);
    applyExpediteSyncBoxClamp(d);
    return {
      pulse: {
        ...d,
        source,
      },
      analystProTip: null,
    };
  };

  const override = Deno.env.get("MARKET_PULSE_VAN_RATE_USD_MI")?.trim();
  if (override) {
    const n = parseFloat(override);
    if (Number.isFinite(n) && n > 0.4 && n < 25) {
      return fromVan(round4(n), "env_MARKET_PULSE_VAN_RATE_USD_MI");
    }
  }

  const feed = Deno.env.get("SPOT_RATE_FEED_URL")?.trim();
  if (feed) {
    const v = await tryJsonFeed(feed);
    if (v != null) return fromVan(round4(v), "SPOT_RATE_FEED_URL");
  }

  const publicIdx = Deno.env.get("PUBLIC_FREIGHT_INDEX_URL")?.trim();
  if (publicIdx) {
    const v = await tryJsonFeed(publicIdx);
    if (v != null) return fromVan(round4(v), "PUBLIC_FREIGHT_INDEX_URL");
  }

  const googleKey = Deno.env.get("GOOGLE_AI_API_KEY")?.trim();
  if (googleKey) {
    try {
      const datHomepageText = await fetchNewsPageText(DAT_TRENDLINES_URL);
      const analyst = await marketAnalyst({ datHomepageText });
      if (analyst != null) {
        console.log("[resolvePulseMarketRates] analyst pulse row:", analyst.row);
        return {
          pulse: { ...analyst.row, source: PULSE_SOURCE_PUBLISHED },
          analystProTip: analyst.pro_tip,
        };
      }
    } catch (e) {
      console.error(
        "[resolvePulseMarketRates] marketAnalyst path error:",
        e instanceof Error ? e.stack ?? e.message : String(e)
      );
    }
  }

  const guessed = await geminiGuessDryVanSpotUsdPerMile({ prevVan });
  if (guessed != null) {
    console.log(
      "[resolvePulseMarketRates] Gemini van-only estimate (no analyst row):",
      guessed
    );
    return fromVan(guessed, "gemini_estimate_no_live_scrape");
  }

  const fb = fallbackDefaultVan();
  return fromVan(fb.usdPerMile, fb.source);
}

function deriveRates(van: number): Omit<MarketRow, "source"> {
  return {
    van_dry: round4(van),
    reefer: round4(van * 1.12),
    flatbed: round4(van * 0.98),
    box_truck: round4(van * 0.82),
    sprinter: round4(van * 0.62),
    power_only: round4(van * 0.88),
  };
}

function buildProTip(params: {
  van: number;
  sprinter: number;
  prevSprinter: number | null;
}): string {
  if (params.prevSprinter != null && params.prevSprinter > 0) {
    const pct = ((params.sprinter - params.prevSprinter) / params.prevSprinter) * 100;
    const dir = pct >= 0 ? "up" : "down";
    const abs = Math.abs(pct).toFixed(1);
    if (Math.abs(pct) >= 0.5) {
      return `Sprinter / cargo-van rates are ${dir} ${abs}% vs yesterday—don't take less than $${params.sprinter.toFixed(2)}/mi on short regional work.`;
    }
  }
  return `Dry van national spot is near $${params.van.toFixed(2)}/mi—anchor Sprinter near $${params.sprinter.toFixed(2)}/mi and box trucks near $${(params.van * 0.82).toFixed(2)}/mi when quoting shippers.`;
}

function sanitizeOneSentenceGemini(raw: string): string {
  const flat = raw.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean)[0] ??
    raw.replace(/\s+/g, " ").trim();
  return flat
    .replace(/^["'`“”]+|["'`“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);
}

type GeminiRatesPayload = {
  van_dry: number;
  reefer: number;
  flatbed: number;
  box_truck: number;
  sprinter: number;
  power_only: number;
  source: string;
};

/**
 * One-line Pro Tip via Gemini (`GOOGLE_AI_API_KEY`).
 * Uses `geminiGenerateContentUrl` → **v1beta** + `GEMINI_FLASH_MODEL_ID` (e.g. `gemini-3.1-flash-lite-preview`).
 * Never throws; uses `res.text()` only.
 */
async function geminiDispatcherProTip(params: {
  rates: GeminiRatesPayload;
  prevVan: number | null;
}): Promise<{ text: string; model: string | null }> {
  const fallback = (): { text: string; model: string | null } => ({
    text: GEMINI_FALLBACK_PRO_TIP,
    model: null,
  });

  try {
    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY")?.trim();
    if (!apiKey) {
      console.log("[geminiDispatcherProTip] GOOGLE_AI_API_KEY is not set; using fallback pro tip.");
      return fallback();
    }

    const prevLine =
      params.prevVan != null && params.prevVan > 0
        ? `Previous pulse dry van benchmark was $${params.prevVan.toFixed(2)}/mi.`
        : "No prior pulse row in our database for comparison.";

    const prompt =
      `You are a North American truck freight dispatcher coach.\n` +
      `Here are today's estimated national spot benchmarks (USD per mile), derived from a public freight index / pulse pipeline:\n` +
      `- Dry van: $${params.rates.van_dry.toFixed(2)}/mi\n` +
      `- Reefer: $${params.rates.reefer.toFixed(2)}/mi\n` +
      `- Flatbed: $${params.rates.flatbed.toFixed(2)}/mi\n` +
      `- Box truck (26ft): $${params.rates.box_truck.toFixed(2)}/mi\n` +
      `- Sprinter / cargo van (expedite): $${params.rates.sprinter.toFixed(2)}/mi\n` +
      `Index / source label: ${params.rates.source}.\n` +
      `${prevLine}\n\n` +
      `Write EXACTLY ONE clear sentence (max 40 words) of actionable Pro Tip for dispatchers negotiating or quoting loads today. ` +
      `No markdown, no bullets, no quotation marks, no second sentence.`;

    const genUrl = geminiGenerateContentUrl(apiKey);

    console.log(
      `[geminiDispatcherProTip] model=${GEMINI_FLASH_MODEL_ID} keyLen=${apiKey.length}`
    );

    let res: Response;
    try {
      res = await fetch(genUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 128,
            temperature: 0.42,
            topP: 0.9,
          },
        }),
        signal: AbortSignal.timeout(28_000),
      });
    } catch (e) {
      console.error("[geminiDispatcherProTip] Google fetch failed:", e);
      return fallback();
    }

    const raw = await res.text();

    if (!res.ok) {
      console.error(
        `[geminiDispatcherProTip] model=${GEMINI_FLASH_MODEL_ID} HTTP ${res.status} body=`,
        raw.slice(0, 2000)
      );
      return fallback();
    }

    let j: Record<string, unknown>;
    try {
      j = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.error("[geminiDispatcherProTip] JSON parse failed, body=", raw.slice(0, 800));
      return fallback();
    }

    const cands = j.candidates as unknown[] | undefined;
    const first = cands?.[0] as Record<string, unknown> | undefined;
    const finish = first?.finishReason;
    const content = first?.content as Record<string, unknown> | undefined;
    const parts = content?.parts as unknown[] | undefined;
    const part0 = parts?.[0] as Record<string, unknown> | undefined;
    const text = part0?.text;
    if (typeof text !== "string" || !text.trim()) {
      console.error(
        `[geminiDispatcherProTip] no usable text model=${GEMINI_FLASH_MODEL_ID} finishReason=${String(finish)}`
      );
      return fallback();
    }
    const cleaned = sanitizeOneSentenceGemini(text);
    if (cleaned.length < 12) return fallback();
    return { text: cleaned, model: GEMINI_FLASH_MODEL_ID };
  } catch (e) {
    console.error(
      "[geminiDispatcherProTip] unexpected error; using fallback pro tip.",
      e instanceof Error ? e.stack ?? e.message : String(e)
    );
    return fallback();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Nexus Control / announcement-style HTML (mirrors `src/lib/admin/announcement-email-html.ts` layout).
 */
function buildPulseEmailHtml(params: {
  dateLabel: string;
  rates: MarketRow & { pro_tip: string };
  dashboardUrl: string;
}): string {
  let origin = "https://nexusfreight.tech";
  try {
    origin = new URL(params.dashboardUrl).origin;
  } catch {
    /* keep default */
  }
  const logoUrl = `${origin.replace(/\/$/, "")}/nexusfreight-logo-v2.svg`;
  const dashHref = escapeHtml(params.dashboardUrl);
  const tip = escapeHtml(params.rates.pro_tip);

  const rateCell = (label: string, val: number) =>
    `<td width="50%" valign="top" style="padding:8px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1c2127;border:1px solid #2a2f36;border-radius:10px;">` +
    `<tr><td style="padding:14px 16px;">` +
    `<p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">${escapeHtml(label)}</p>` +
    `<p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">$${val.toFixed(2)}<span style="font-size:13px;font-weight:600;color:#94a3b8;">/mi</span></p>` +
    `</td></tr></table></td>`;

  const r = params.rates;
  const gridRows =
    `<tr>${rateCell("Dry van (national)", r.van_dry)}${rateCell("Reefer", r.reefer)}</tr>` +
    `<tr>${rateCell("Flatbed", r.flatbed)}${rateCell("Box truck (26ft)", r.box_truck)}</tr>` +
    `<tr>${rateCell("Cargo van (expedite)", r.sprinter)}${rateCell("Sprinter", r.power_only)}</tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#0f1114;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f1114;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#16181a;border:1px solid #2a2f36;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:24px 32px 20px 32px;border-bottom:1px solid #2a2f36;background:#121416;">
            <img src="${escapeHtml(logoUrl)}" alt="NexusFreight" width="200" style="display:block;max-width:200px;height:auto;border:0;" />
            <p style="margin:14px 0 0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#3b82f6;">Market pulse</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#f8fafc;line-height:1.25;">National spot benchmarks</h1>
            <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">${escapeHtml(params.dateLabel)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px 32px;">
            <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#cbd5e1;">
              Figures below are <strong style="color:#e2e8f0;">national averages</strong> for planning and negotiation—they are
              <strong style="color:#e2e8f0;">not guarantees</strong> on any specific load, lane, or contract.
            </p>
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Equipment ($/mi)</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${gridRows}</table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 28px 32px;">
            <div style="margin-top:4px;padding:18px 20px;background:#0f1419;border-radius:10px;border:1px solid #1e3a5f;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#60a5fa;">Nexus Intelligence</p>
              <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#e2e8f0;">${tip}</p>
            </div>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
              <tr>
                <td style="border-radius:8px;background:#2563eb;">
                  <a href="${dashHref}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Open dashboard</a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#64748b;">You received this because your account is on the morning Market Pulse list.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px 32px;border-top:1px solid #2a2f36;">
            <p style="margin:0;font-size:12px;line-height:1.55;color:#64748b;">NexusFreight · Automated morning market pulse · <a href="https://nexusfreight.tech" style="color:#60a5fa;text-decoration:none;">nexusfreight.tech</a></p>
            <p style="margin:12px 0 0;font-size:11px;letter-spacing:0.08em;color:#475569;">Digital. Direct. Driven.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const PROFILES_PAGE_SIZE = 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CANARY_INFO_EMAIL = "info@nexusfreight.tech";

function addEmailToMap(byEmail: Map<string, { email: string }>, raw: string | null | undefined): void {
  if (raw == null || String(raw).trim() === "") return;
  const em = String(raw).trim().toLowerCase();
  if (!EMAIL_RE.test(em)) return;
  if (!byEmail.has(em)) byEmail.set(em, { email: em });
}

/** Primary: all `profiles.auth_email` (paginated). */
async function collectEmailsFromProfiles(
  supabase: ReturnType<typeof createClient>
): Promise<{ byEmail: Map<string, { email: string }>; error: string | null }> {
  const byEmail = new Map<string, { email: string }>();
  let from = 0;
  for (;;) {
    const { data: users, error } = await supabase
      .from("profiles")
      .select("auth_email")
      .order("id", { ascending: true })
      .range(from, from + PROFILES_PAGE_SIZE - 1);
    if (error) {
      console.error("[automated-market-pulse] profiles select failed:", error);
      return { byEmail, error: error.message };
    }
    if (!users?.length) break;
    const emails = users
      .map((u: { auth_email: string | null }) => u.auth_email)
      .filter(Boolean) as string[];
    for (const raw of emails) addEmailToMap(byEmail, raw);
    if (users.length < PROFILES_PAGE_SIZE) break;
    from += PROFILES_PAGE_SIZE;
  }
  return { byEmail, error: null };
}

async function collectMarketPulseRecipients(
  supabase: ReturnType<typeof createClient>
): Promise<{ recipients: Array<{ email: string }>; error: string | null }> {
  const { byEmail, error } = await collectEmailsFromProfiles(supabase);
  if (error) {
    return { recipients: [], error };
  }

  console.log(
    "[automated-market-pulse] production recipient source: profiles.auth_email only, count:",
    byEmail.size
  );

  return { recipients: [...byEmail.values()], error: null };
}

const json200 = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type MarketRatesTableShape = "equipment" | "wide" | "missing";

function isMarketRatesTableMissingInCache(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    (m.includes("market_rates") && m.includes("table") && m.includes("schema cache")) ||
    (m.includes("relation") && m.includes("market_rates") && m.includes("does not exist"))
  );
}

/** PostgREST validates selected columns; distinguishes wide vs equipment vs dropped table. */
async function detectMarketRatesTableShape(
  supabase: ReturnType<typeof createClient>
): Promise<MarketRatesTableShape> {
  const { error: eqErr } = await supabase
    .from("market_rates")
    .select("equipment_type")
    .limit(1);
  if (!eqErr) return "equipment";
  if (isMarketRatesTableMissingInCache(eqErr.message)) return "missing";

  const { error: wideErr } = await supabase
    .from("market_rates")
    .select("van_dry")
    .limit(1);
  if (!wideErr) return "wide";
  if (isMarketRatesTableMissingInCache(wideErr.message)) return "missing";

  console.error(
    "[automated-market-pulse] market_rates schema unknown:",
    eqErr.message,
    wideErr.message
  );
  return "missing";
}

async function marketHistoryTableExists(
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  const { error } = await supabase.from("market_history").select("id").limit(1);
  if (!error) return true;
  const m = (error.message ?? "").toLowerCase();
  const missing =
    (m.includes("market_history") && m.includes("schema cache")) ||
    (m.includes("market_history") && m.includes("does not exist"));
  return !missing;
}

Deno.serve(async (req) => {
  try {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /** Admin client: uses built-in `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` at runtime. */
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const resendKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const siteUrl =
    Deno.env.get("PUBLIC_SITE_URL")?.trim() || "https://nexusfreight.tech";
  const fromAddr =
    Deno.env.get("MARKET_PULSE_FROM")?.trim() ||
    "NexusFreight <info@nexusfreight.tech>";

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return json200({ ok: false, error: "Server misconfigured (Supabase)." });
  }

  /**
   * No manual 403: hosted Edge always has `SUPABASE_SERVICE_ROLE_KEY` injected.
   * If that key exists, we trust the platform and allow POST (e.g. cron) without
   * caller-supplied Authorization. Protect this URL (schedule only, no public links).
   */
  const supabaseServiceRoleKeyNorm = normKey(supabaseServiceRoleKey);
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKeyNorm);

  const ratesShape = await detectMarketRatesTableShape(supabase);
  if (ratesShape === "missing") {
    return json200({
      ok: false,
      error:
        "public.market_rates is missing from the database (PostgREST schema cache). " +
        "This usually means migration 00065 failed after renaming/dropping the table. " +
        "Run supabase/migrations/00066_market_rates_restore_if_missing.sql in the SQL editor (or restore from backup), " +
        "then run migration 00065 again if you still want per-equipment rows.",
    });
  }

  const hasMarketHistory = await marketHistoryTableExists(supabase);

  const todayUtc = utcCalendarDate(new Date());
  /** Edge secret `FORCE_MARKET_PULSE=1` skips “already published today” so you can re-run manually. */
  const forceMarketPulse = Deno.env.get("FORCE_MARKET_PULSE")?.trim() === "1";
  if (!forceMarketPulse) {
    if (hasMarketHistory) {
      const { count, error: cErr } = await supabase
        .from("market_history")
        .select("id", { count: "exact", head: true })
        .eq("snapshot_date", todayUtc);
      if (!cErr && (count ?? 0) > 0) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            reason: "already_published_today_utc_market_history",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (ratesShape === "wide") {
      const utcMidnight = new Date();
      utcMidnight.setUTCHours(0, 0, 0, 0);
      const { count, error: cErr } = await supabase
        .from("market_rates")
        .select("id", { count: "exact", head: true })
        .gte("as_of", utcMidnight.toISOString());
      if (!cErr && (count ?? 0) > 0) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            reason: "already_published_today_utc_market_rates_wide",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const { data: dryPeek } = await supabase
        .from("market_rates")
        .select("as_of")
        .eq("equipment_type", "dry_van")
        .maybeSingle();
      const asOf = dryPeek?.as_of;
      if (typeof asOf === "string" && utcCalendarDate(new Date(asOf)) === todayUtc) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            reason: "already_published_today_utc_equipment_rates",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  }

  let prevSprinter: number | null = null;
  let prevVan: number | null = null;

  if (hasMarketHistory) {
    const { data: prevHist } = await supabase
      .from("market_history")
      .select("van_dry, sprinter")
      .lt("snapshot_date", todayUtc)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const prevRec = prevHist as { sprinter?: unknown; van_dry?: unknown } | null;
    if (prevRec) {
      const sv = Number(prevRec.sprinter);
      const vv = Number(prevRec.van_dry);
      if (Number.isFinite(sv) && sv > 0) prevSprinter = sv;
      if (Number.isFinite(vv) && vv > 0) prevVan = vv;
    }
  }

  if (prevVan == null || prevSprinter == null) {
    if (ratesShape === "wide") {
      const { data: prevRow } = await supabase
        .from("market_rates")
        .select("sprinter, van_dry")
        .order("as_of", { ascending: false })
        .limit(1)
        .maybeSingle();
      const pr = prevRow as { sprinter?: unknown; van_dry?: unknown } | null;
      if (prevSprinter == null) {
        const n = Number(pr?.sprinter);
        if (Number.isFinite(n) && n > 0) prevSprinter = n;
      }
      if (prevVan == null) {
        const n = Number(pr?.van_dry);
        if (Number.isFinite(n) && n > 0) prevVan = n;
      }
    } else {
      const { data: maxAs } = await supabase
        .from("market_rates")
        .select("as_of")
        .order("as_of", { ascending: false })
        .limit(1)
        .maybeSingle();
      const key = maxAs?.as_of;
      if (typeof key === "string") {
        const { data: rows } = await supabase
          .from("market_rates")
          .select("equipment_type, usd_per_mile")
          .eq("as_of", key);
        const list = rows as Array<{ equipment_type?: string; usd_per_mile?: unknown }> | null;
        for (const r of list ?? []) {
          const v = Number(r.usd_per_mile);
          if (!Number.isFinite(v) || v <= 0) continue;
          if (r.equipment_type === "dry_van" && prevVan == null) prevVan = v;
          if (r.equipment_type === "cargo_van" && prevSprinter == null) prevSprinter = v;
        }
      }
    }
  }

  const { pulse: pulseRow, analystProTip } = await resolvePulseMarketRates(prevVan);
  const { source, ...derivedEquip } = pulseRow;
  const derived = derivedEquip;
  const ratesForTip: GeminiRatesPayload = {
    ...derived,
    source,
  };

  const googleKey = Deno.env.get("GOOGLE_AI_API_KEY")?.trim();
  let pro_tip: string;
  let pro_tip_source: "gemini" | "gemini_fallback" | "template" = "template";
  let gemini_model: string | undefined;

  if (analystProTip && pulseRow.source === PULSE_SOURCE_PUBLISHED) {
    pro_tip = analystProTip;
    pro_tip_source = "gemini";
    gemini_model = GEMINI_FLASH_MODEL_ID;
  } else if (googleKey) {
    const gem = await geminiDispatcherProTip({
      rates: ratesForTip,
      prevVan,
    });
    pro_tip = gem.text;
    if (gem.model) {
      pro_tip_source = "gemini";
      gemini_model = gem.model;
    } else {
      pro_tip_source = "gemini_fallback";
    }
  } else {
    pro_tip = buildProTip({
      van: derived.van_dry,
      sprinter: derived.sprinter,
      prevSprinter,
    });
  }

  const asOf = new Date().toISOString();
  let persisted: Record<string, unknown>;

  // Pulse writes: `market_rates` (wide insert or per-equipment upsert) + `market_history` when present.
  if (ratesShape === "wide") {
    const insertPayload = {
      source,
      van_dry: derived.van_dry,
      reefer: derived.reefer,
      flatbed: derived.flatbed,
      box_truck: derived.box_truck,
      sprinter: derived.sprinter,
      power_only: derived.power_only,
      pro_tip,
    };
    const { data: inserted, error: insErr } = await supabase
      .from("market_rates")
      .insert(insertPayload)
      .select("id, as_of")
      .maybeSingle();
    if (insErr) {
      console.error("[automated-market-pulse] market_rates wide insert failed:", insErr);
      return json200({
        ok: false,
        error: insErr.message || "Database market_rates insert failed",
      });
    }
    if (!inserted) {
      console.error("[automated-market-pulse] market_rates wide insert returned no row");
      return json200({ ok: false, error: "Database market_rates insert returned no row" });
    }
    persisted = {
      schema: "wide",
      snapshot_date: todayUtc,
      id: (inserted as { id?: string }).id,
      as_of: (inserted as { as_of?: string }).as_of,
    };

    if (hasMarketHistory) {
      const { error: histErr } = await supabase
        .from("market_history")
        .upsert(
          {
            snapshot_date: todayUtc,
            source,
            van_dry: derived.van_dry,
            reefer: derived.reefer,
            flatbed: derived.flatbed,
            box_truck: derived.box_truck,
            sprinter: derived.sprinter,
            power_only: derived.power_only,
            pro_tip,
          },
          { onConflict: "snapshot_date" }
        );
      if (histErr) {
        console.error("[automated-market-pulse] market_history upsert failed:", histErr);
        return json200({
          ok: false,
          error: histErr.message || "Database market_history upsert failed",
        });
      }
    }
  } else {
    const equipmentUpserts = buildEquipmentRateUpserts({
      derived,
      source,
      pro_tip,
      asOf,
    });
    const { error: ratesErr } = await supabase
      .from("market_rates")
      .upsert(equipmentUpserts, { onConflict: "equipment_type" });
    if (ratesErr) {
      console.error("[automated-market-pulse] market_rates upsert failed:", ratesErr);
      return json200({
        ok: false,
        error: ratesErr.message || "Database market_rates upsert failed",
      });
    }
    persisted = {
      schema: "equipment",
      snapshot_date: todayUtc,
      as_of: asOf,
      equipment_rows: equipmentUpserts.length,
    };

    if (hasMarketHistory) {
      const { error: histErr } = await supabase
        .from("market_history")
        .upsert(
          {
            snapshot_date: todayUtc,
            source,
            van_dry: derived.van_dry,
            reefer: derived.reefer,
            flatbed: derived.flatbed,
            box_truck: derived.box_truck,
            sprinter: derived.sprinter,
            power_only: derived.power_only,
            pro_tip,
          },
          { onConflict: "snapshot_date" }
        );
      if (histErr) {
        console.error("[automated-market-pulse] market_history upsert failed:", histErr);
        return json200({
          ok: false,
          error: histErr.message || "Database market_history upsert failed",
        });
      }
    }
  }

  let sent = 0;
  const errors: string[] = [];
  let emailRecipientCount = 0;

  if (resendKey) {
    let recipients: Array<{ email: string }>;

    if (IS_TEST_MODE) {
      const test = MARKET_PULSE_TEST_EMAIL.trim().toLowerCase();
      if (!EMAIL_RE.test(test)) {
        return json200({ ok: false, error: "MARKET_PULSE_TEST_EMAIL is invalid." });
      }
      recipients = [{ email: test }];
      console.log("[automated-market-pulse] IS_TEST_MODE: Resend recipients =", [test]);
    } else {
      const { recipients: merged, error: profErr } =
        await collectMarketPulseRecipients(supabase);
      if (profErr) {
        return json200({ ok: false, error: profErr });
      }
      recipients = merged;
      console.log(
        "[automated-market-pulse] production recipients (profiles.auth_email):",
        recipients.length
      );
      if (
        !recipients.map((r) => r.email.toLowerCase()).includes(CANARY_INFO_EMAIL)
      ) {
        console.log("Warning: Info email missing from list");
      }
    }
    emailRecipientCount = recipients.length;
    const dateLabel = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Chicago",
    });
    const subject = `🚚 Morning Market Pulse: ${dateLabel}`;
    const dashboardUrl = `${siteUrl.replace(/\/$/, "")}/dashboard`;
    const html = buildPulseEmailHtml({
      dateLabel,
      rates: { ...derived, source, pro_tip },
      dashboardUrl,
    });
    const textPlain =
      `${subject}\n\n` +
      `National averages (benchmarks only—not guarantees on specific loads or lanes):\n` +
      `Dry van ${derived.van_dry.toFixed(2)}/mi · Reefer ${derived.reefer.toFixed(2)} · Flatbed ${derived.flatbed.toFixed(2)} · Box truck (26ft) ${derived.box_truck.toFixed(2)}\n` +
      `Cargo van (expedite) ${derived.sprinter.toFixed(2)}/mi · Sprinter ${derived.power_only.toFixed(2)}/mi\n\n` +
      `${pro_tip}\n\n${dashboardUrl}\n`;

    console.log("FINAL RECIPIENT LIST:", recipients);

    const RESEND_BATCH = 12;
    let sendIndex = 0;
    for (const { email } of recipients) {
      sendIndex += 1;
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddr,
            to: [email],
            subject,
            html,
            text: textPlain,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error(
            "[automated-market-pulse] Resend HTTP error for",
            email,
            res.status,
            errText.slice(0, 300)
          );
          errors.push(`${email}: HTTP ${res.status} ${errText.slice(0, 160)}`);
        } else {
          sent += 1;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[automated-market-pulse] Resend exception for", email, msg);
        errors.push(`${email}: ${msg.slice(0, 200)}`);
      }
      if (sendIndex % RESEND_BATCH === 0) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  }

  return json200({
    ok: true,
    inserted: persisted,
    van_dry: derived.van_dry,
    source,
    pro_tip_source,
    gemini_model: gemini_model ?? null,
    email_recipients: emailRecipientCount,
    emails_sent: sent,
    email_errors: errors.length ? errors.slice(0, 15) : undefined,
    resend_configured: Boolean(resendKey),
    google_ai_configured: Boolean(googleKey),
    is_test_mode: IS_TEST_MODE,
    force_market_pulse: forceMarketPulse,
  });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[automated-market-pulse] error:", e);
    return json200({ ok: false, error });
  }
});
