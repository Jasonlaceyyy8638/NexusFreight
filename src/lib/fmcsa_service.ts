/**
 * FMCSA QCMobile API — requires FMCSA_WEB_KEY (server-side only).
 * @see https://mobile.fmcsa.dot.gov/QCDevsite/docs/qcApi
 */

const FMCSA_BASE = "https://mobile.fmcsa.dot.gov/qc/services";

export type FmcsaCompanyData = {
  legal_name: string;
  dot_number: string;
  mc_number: string;
  authority_status: "Active" | "Inactive";
  address: string;
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
  const key = process.env.FMCSA_WEB_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

function mapRecord(r: Record<string, unknown>): FmcsaCompanyData {
  const allow = r.allowToOperate === "Y";
  const oos = r.outOfService === "Y";
  const active = allow && !oos;

  const street = r.phyStreet != null ? String(r.phyStreet) : "";
  const city = r.phyCity != null ? String(r.phyCity) : "";
  const state = r.phyState != null ? String(r.phyState) : "";
  const zip = r.phyZip != null ? String(r.phyZip) : "";
  const parts = [street, city, state, zip].filter(Boolean);

  const legal =
    (r.legalName != null && String(r.legalName).trim()) ||
    (r.dbaName != null && String(r.dbaName).trim()) ||
    "";

  return {
    legal_name: legal,
    dot_number:
      r.dotNumber != null ? String(r.dotNumber) : String(r["usdot"] ?? ""),
    mc_number:
      r.mcNumber != null ? String(r.mcNumber) : String(r.docketNumber ?? ""),
    authority_status: active ? "Active" : "Inactive",
    address: parts.join(", "),
  };
}

function extractFirstCarrier(payload: unknown): Record<string, unknown> | null {
  if (payload == null) return null;
  if (Array.isArray(payload)) {
    const first = payload[0];
    return first && typeof first === "object"
      ? (first as Record<string, unknown>)
      : null;
  }
  if (typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.content) && o.content[0] && typeof o.content[0] === "object") {
      return o.content[0] as Record<string, unknown>;
    }
    if (o.legalName != null || o.dotNumber != null || o.mcNumber != null) {
      return o;
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
    return { ok: false, status: res.status, body: text.slice(0, 200) };
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
      error:
        "FMCSA_WEB_KEY is not configured. Add it to your server environment.",
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
        return { ok: false, error: "FMCSA_WEB_KEY is invalid.", code: "unauthorized" };
      }
      return {
        ok: false,
        error: `FMCSA API error (${second.status}).`,
        code: "request_failed",
      };
    }
    payload = second.data;
  } else if (first.status === 401) {
    return { ok: false, error: "FMCSA_WEB_KEY is invalid.", code: "unauthorized" };
  } else {
    return {
      ok: false,
      error: `FMCSA API error (${first.status}).`,
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

  return { ok: true, data };
}
