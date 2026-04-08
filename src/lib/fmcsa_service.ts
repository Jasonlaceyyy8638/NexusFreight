/**
 * FMCSA QCMobile API — server-side key (first match wins):
 * `FMCSA_API_KEY` | `FMCSA_WEB_KEY` | `FMCSA_WEBKEY`
 * @see https://mobile.fmcsa.dot.gov/QCDevsite/docs/qcApi
 */

import {
  computeIsNewAuthority,
  parseFmcsaAuthorityDate,
} from "@/lib/fmcsa_authority";

const FMCSA_BASE = "https://mobile.fmcsa.dot.gov/qc/services";

export type FmcsaCompanyData = {
  legal_name: string;
  /** DBA when present from FMCSA. */
  dba_name: string;
  dot_number: string;
  mc_number: string;
  authority_status: "Active" | "Inactive";
  /** Uppercase label for UI — must be ACTIVE to add carrier / assign loads. */
  operating_status_display: "ACTIVE" | "INACTIVE";
  /** Raw `allowToOperate === "Y"` from FMCSA. */
  allowed_to_operate: boolean;
  /** Full formatted physical address when available. */
  address: string;
  /** City, ST for quick display. */
  city_state: string;
  /**
   * ISO date YYYY-MM-DD from commonAuthorityStatusDate / authDate when present.
   */
  authority_date: string | null;
  /** True when authority_date is set and under 90 days old (calendar days). */
  is_new_authority: boolean;
};

export type FmcsaFetchResult =
  | { ok: true; data: FmcsaCompanyData }
  | { ok: false; error: string; code?: string };

/** Strip MC/MX prefixes and non-digits for docket lookup */
export function normalizeMcDocket(input: string): string {
  const trimmed = input.trim();
  const noPrefix = trimmed.replace(/^(MC|MX|FF)[-\s]*/i, "");
  const digits = noPrefix.replace(/\D/g, "");
  return digits || trimmed.replace(/\s/g, "");
}

function getWebKey(): string | null {
  const key =
    process.env.FMCSA_API_KEY?.trim() ||
    process.env.FMCSA_WEB_KEY?.trim() ||
    process.env.FMCSA_WEBKEY?.trim();
  return key && key.length > 0 ? key : null;
}

function scrubFmcsaUrlForLog(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("webKey")) {
      u.searchParams.set("webKey", "[REDACTED]");
    }
    return u.toString();
  } catch {
    return "[invalid-url]";
  }
}

function mapRecord(r: Record<string, unknown>): FmcsaCompanyData {
  const allowRaw = r.allowToOperate ?? r.allowedToOperate;
  const allow = allowRaw === "Y" || allowRaw === "y";
  const oos = r.outOfService === "Y" || r.outOfService === "y";
  const active = allow && !oos;

  const street = r.phyStreet != null ? String(r.phyStreet) : "";
  const city = r.phyCity != null ? String(r.phyCity) : "";
  const state = r.phyState != null ? String(r.phyState) : "";
  const zip =
    r.phyZip != null
      ? String(r.phyZip)
      : r.phyZipcode != null
        ? String(r.phyZipcode)
        : "";
  const parts = [street, city, state, zip].filter(Boolean);

  const legalRaw =
    r.legalName != null ? String(r.legalName).trim() : "";
  const dbaRaw = r.dbaName != null ? String(r.dbaName).trim() : "";
  const legal = legalRaw || dbaRaw || "";

  const cityState = [city, state].filter(Boolean).join(", ");

  const authRaw =
    r.commonAuthorityStatusDate ??
    r.common_authority_status_date ??
    r.authDate ??
    r.auth_date;
  const authority_date = parseFmcsaAuthorityDate(authRaw);
  const is_new_authority = computeIsNewAuthority(authority_date);

  return {
    legal_name: legal,
    dba_name: dbaRaw,
    dot_number:
      r.dotNumber != null ? String(r.dotNumber) : String(r["usdot"] ?? ""),
    mc_number:
      r.mcNumber != null ? String(r.mcNumber) : String(r.docketNumber ?? ""),
    authority_status: active ? "Active" : "Inactive",
    operating_status_display: active ? "ACTIVE" : "INACTIVE",
    allowed_to_operate: allow,
    address: parts.join(", "),
    city_state: cityState,
    authority_date,
    is_new_authority,
  };
}

/**
 * QCMobile often wraps the carrier row in `{ content: [{ carrier: { ... } }] }`.
 * Flat records (legalName / dotNumber on the root) are returned as-is.
 */
function unwrapCarrierRecord(
  rec: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!rec || typeof rec !== "object") return null;
  const inner = rec.carrier;
  if (inner && typeof inner === "object") {
    return inner as Record<string, unknown>;
  }
  return rec;
}

function extractFirstCarrier(payload: unknown): Record<string, unknown> | null {
  if (payload == null) return null;
  if (Array.isArray(payload)) {
    const first = payload[0];
    if (first && typeof first === "object") {
      return unwrapCarrierRecord(first as Record<string, unknown>);
    }
    return null;
  }
  if (typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.content) && o.content[0] && typeof o.content[0] === "object") {
      return unwrapCarrierRecord(o.content[0] as Record<string, unknown>);
    }
    if (o.legalName != null || o.dotNumber != null || o.mcNumber != null) {
      return unwrapCarrierRecord(o);
    }
    if (o.carrier && typeof o.carrier === "object") {
      return o.carrier as Record<string, unknown>;
    }
  }
  return null;
}

async function fetchFmcsa(url: string): Promise<
  { ok: true; data: unknown } | { ok: false; status: number; body: string }
> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    console.error("[FMCSA QCMobile]", {
      responseStatus: res.status,
      url: scrubFmcsaUrlForLog(url),
      errorBody: text,
    });
    return { ok: false, status: res.status, body: text.slice(0, 500) };
  }
  return { ok: true, data };
}

/**
 * Looks up carrier data by MC/MX docket (digits) or U.S. DOT number.
 * Tries `/carriers/docket-number/:n/` first, then `/carriers/:n`.
 */
export async function fetchCompanyData(number: string): Promise<FmcsaFetchResult> {
  const key = getWebKey();
  if (!key) {
    return {
      ok: false,
      error: "Configuration Error: Missing FMCSA Key",
      code: "missing_key",
    };
  }

  const raw = number.trim();
  if (!raw) {
    return { ok: false, error: "Enter an MC or DOT number.", code: "empty" };
  }

  const docket = normalizeMcDocket(raw);
  if (!docket) {
    return { ok: false, error: "Enter a valid MC or DOT number.", code: "empty" };
  }

  const encodedKey = encodeURIComponent(key);
  const docketUrl = `${FMCSA_BASE}/carriers/docket-number/${encodeURIComponent(docket)}/?webKey=${encodedKey}`;
  const dotUrl = `${FMCSA_BASE}/carriers/${encodeURIComponent(docket)}?webKey=${encodedKey}`;

  let payload: unknown;

  const first = await fetchFmcsa(docketUrl);
  if (first.ok) {
    payload = first.data;
  } else if (first.status === 404) {
    const second = await fetchFmcsa(dotUrl);
    if (!second.ok) {
      if (second.status === 404) {
        return {
          ok: false,
          error: "No carrier found for this MC or DOT number.",
          code: "not_found",
        };
      }
      if (second.status === 401) {
        return {
          ok: false,
          error:
            "Invalid API key — check FMCSA_API_KEY / FMCSA_WEB_KEY (FMCSA QCMobile returned 401).",
          code: "unauthorized",
        };
      }
      return {
        ok: false,
        error: `FMCSA server error (${second.status}): ${second.body || "no body"}`,
        code: "request_failed",
      };
    }
    payload = second.data;
  } else if (first.status === 401) {
    return {
      ok: false,
      error:
        "Invalid API key — check FMCSA_API_KEY / FMCSA_WEB_KEY (FMCSA QCMobile returned 401).",
      code: "unauthorized",
    };
  } else {
    return {
      ok: false,
      error: `FMCSA server error (${first.status}): ${first.body || "no body"}`,
      code: "request_failed",
    };
  }

  const row = extractFirstCarrier(payload);
  if (!row) {
    return { ok: false, error: "No carrier data returned.", code: "empty_result" };
  }

  const data = mapRecord(row);
  if (!data.legal_name && !data.dot_number) {
    return { ok: false, error: "Incomplete carrier record.", code: "incomplete" };
  }

  if (!data.mc_number.trim() && docket) {
    data.mc_number = docket;
  }

  return { ok: true, data };
}

/** Matches add-carrier / load-assignment rules: ACTIVE, allowed to operate, authority active. */
export function isFmcsaOperatingActive(d: FmcsaCompanyData): boolean {
  return (
    d.operating_status_display === "ACTIVE" &&
    d.allowed_to_operate &&
    d.authority_status === "Active"
  );
}
