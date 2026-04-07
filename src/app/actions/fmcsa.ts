"use server";

import {
  fetchCompanyData,
  type FmcsaCompanyData,
  type FmcsaFetchResult,
} from "@/lib/fmcsa_service";

const LOOKUP_FAILED_MESSAGE =
  "MC Number not found. Please verify and try again.";

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
