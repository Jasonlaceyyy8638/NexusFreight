"use client";

import { useCallback, useRef, useState } from "react";
import type { FmcsaCompanyData } from "@/lib/fmcsa_service";

type FetchCarrierDataResult =
  | { ok: true; data: FmcsaCompanyData }
  | { ok: false; error: string; code?: string };

export async function fetchFmcsaLookupPost(
  mc: string
): Promise<FetchCarrierDataResult> {
  let res: Response;
  try {
    res = await fetch("/api/fmcsa/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: mc }),
      cache: "no-store",
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Network error calling FMCSA lookup.";
    return {
      ok: false,
      error: `Request failed: ${msg}`,
      code: "network_error",
    };
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    return {
      ok: false,
      error: `Could not read FMCSA response (HTTP ${res.status}).`,
      code: "parse_error",
    };
  }

  const result = parsed as FetchCarrierDataResult & { error?: string; code?: string };
  if (!result || typeof result !== "object" || !("ok" in result)) {
    return {
      ok: false,
      error: `Invalid FMCSA response (HTTP ${res.status}).`,
      code: "invalid_response",
    };
  }

  if (!result.ok) {
    const base =
      typeof result.error === "string"
        ? result.error
        : "FMCSA lookup failed";
    return {
      ok: false,
      error: res.ok ? base : `${base} (HTTP ${res.status})`,
      code: result.code ?? (res.ok ? undefined : "http_error"),
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `Unexpected HTTP ${res.status} with success-shaped JSON.`,
      code: "http_error",
    };
  }

  return result;
}

const MIN_DIGITS = 6;

export type UseFmcsaManualMcLookupOptions = {
  enabled: boolean;
};

/**
 * FMCSA MC lookup — manual trigger only (no useEffect on MC input).
 * Call `runLookup(mcInput)` from the "Check MC number now" button.
 */
export function useFmcsaManualMcLookup(options: UseFmcsaManualMcLookupOptions) {
  const enabledRef = useRef(options.enabled);
  enabledRef.current = options.enabled;

  const [isLoading, setIsLoading] = useState(false);
  const [carrierData, setCarrierData] = useState<FmcsaCompanyData | null>(null);
  /** Digits string this `carrierData` belongs to (must match current field to count as verified). */
  const [verifiedDigits, setVerifiedDigits] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<{
    message: string;
    code?: string;
  } | null>(null);

  const requestIdRef = useRef(0);

  const resetLookup = useCallback(() => {
    requestIdRef.current += 1;
    setIsLoading(false);
    setCarrierData(null);
    setVerifiedDigits(null);
    setLookupError(null);
  }, []);

  const runLookup = useCallback(async (mcRaw: string) => {
    if (!enabledRef.current) {
      return;
    }

    const raw = mcRaw.trim();
    const digits = raw.replace(/\D/g, "");
    if (!raw || digits.length < MIN_DIGITS) {
      setLookupError({
        message: "Enter at least 6 digits before checking.",
      });
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLookupError(null);

    try {
      const result = await fetchFmcsaLookupPost(raw);
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!result.ok) {
        setCarrierData(null);
        setVerifiedDigits(null);
        const msg =
          result.code === "missing_key"
            ? "Configuration Error: Missing FMCSA Key"
            : typeof result.error === "string"
              ? result.error
              : "MC Number not found. Please verify and try again.";
        setLookupError({ message: msg, code: result.code });
        return;
      }

      setCarrierData(result.data);
      setVerifiedDigits(digits);
      setLookupError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setCarrierData(null);
      setVerifiedDigits(null);
      setLookupError({
        message:
          err instanceof Error
            ? err.message
            : "Unexpected error during FMCSA lookup.",
        code: "client_exception",
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  return {
    isLoading,
    carrierData,
    verifiedDigits,
    lookupError,
    runLookup,
    resetLookup,
  };
}
