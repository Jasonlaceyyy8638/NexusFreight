"use client";

import { useEffect, useState } from "react";
import { fetchCarrierData } from "@/app/actions/fmcsa";
import type { FmcsaCompanyData } from "@/lib/fmcsa_service";

export type FmcsaLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: FmcsaCompanyData }
  | { status: "error"; message: string; code?: string }
  | { status: "missing_key" };

const MIN_DIGITS = 4;
const DEBOUNCE_MS = 550;

export function useFmcsaMcLookup(mcInput: string) {
  const [state, setState] = useState<FmcsaLookupState>({ status: "idle" });

  useEffect(() => {
    const digits = mcInput.replace(/\D/g, "");
    if (!mcInput.trim() || digits.length < MIN_DIGITS) {
      queueMicrotask(() => setState({ status: "idle" }));
      return;
    }

    queueMicrotask(() => setState({ status: "loading" }));
    const t = window.setTimeout(async () => {
      try {
        const result = await fetchCarrierData(mcInput);
        if (!result.ok) {
          if (result.code === "missing_key") {
            setState({ status: "missing_key" });
            return;
          }
          setState({
            status: "error",
            message: result.error,
            code: result.code,
          });
          return;
        }
        setState({ status: "success", data: result.data });
      } catch {
        setState({
          status: "error",
          message:
            "MC Number not found. Please verify and try again.",
        });
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [mcInput]);

  return state;
}
