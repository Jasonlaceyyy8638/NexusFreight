"use server";

import {
  fetchCompanyData,
  normalizeMcDocket,
  type FmcsaCompanyData,
  type FmcsaFetchResult,
} from "@/lib/fmcsa_service";

const LOOKUP_FAILED_MESSAGE =
  "MC Number not found. Please verify and try again.";

/**
 * Optional mock carrier when FMCSA is unavailable or for staging.
 * Set `FMCSA_MOCK_DOCKET` to digits only (e.g. `1234567`) on the server — works in
 * production (Vercel). If unset, `development` still defaults to `1234567`.
 */
function resolveMockDocketDigits(): string | null {
  const fromEnv = process.env.FMCSA_MOCK_DOCKET?.trim();
  if (fromEnv) {
    const d = normalizeMcDocket(fromEnv);
    if (d.length >= 6) return d;
    return null;
  }
  if (process.env.NODE_ENV === "development") {
    return "1234567";
  }
  return null;
}

function mockCarrierDataIfConfigured(mcNumber: string): FmcsaCompanyData | null {
  const mockDigits = resolveMockDocketDigits();
  if (!mockDigits) return null;
  const input = normalizeMcDocket(mcNumber);
  if (input !== mockDigits) return null;
  return {
    legal_name: "Nexus Test Carrier",
    dba_name: "",
    dot_number: "12345678",
    mc_number: mockDigits,
    authority_status: "Active",
    operating_status_display: "ACTIVE",
    allowed_to_operate: true,
    address: "1 Test Way, Austin, TX 78701",
    city_state: "Austin, TX",
    authority_date: null,
    is_new_authority: false,
  };
}

export type FetchCarrierDataResult =
  | { ok: true; data: FmcsaCompanyData }
  | { ok: false; error: string; code?: string };

/**
 * Server-side FMCSA lookup by MC/MX docket or DOT (same as `fetchCompanyData`).
 * Maps “not found” and transport/API failures to a single dispatcher-friendly message.
 */
export async function fetchCarrierData(
  mcNumber: string
): Promise<FetchCarrierDataResult> {
  const mock = mockCarrierDataIfConfigured(mcNumber);
  if (mock) {
    return { ok: true, data: mock };
  }

  const result: FmcsaFetchResult = await fetchCompanyData(mcNumber);
  if (result.ok) {
    return { ok: true, data: result.data };
  }

  if (result.code === "missing_key") {
    return { ok: false, error: result.error, code: "missing_key" };
  }
  if (result.code === "unauthorized") {
    return { ok: false, error: result.error, code: "unauthorized" };
  }
  if (result.code === "empty") {
    return { ok: false, error: "Enter an MC number.", code: "empty" };
  }

  return {
    ok: false,
    error: LOOKUP_FAILED_MESSAGE,
    code: result.code ?? "lookup_failed",
  };
}
