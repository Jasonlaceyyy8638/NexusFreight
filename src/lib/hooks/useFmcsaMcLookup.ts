"use client";

import { useEffect, useState } from "react";
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
        const res = await fetch("/api/fmcsa/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number: mcInput }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: FmcsaCompanyData;
          error?: string;
          code?: string;
        };

        if (res.status === 503 && json.code === "missing_key") {
          setState({ status: "missing_key" });
          return;
        }
        if (res.status === 400) {
          setState({
            status: "error",
            message: json.error ?? "Invalid request",
            code: json.code,
          });
          return;
        }
        if (!json.ok || !json.data) {
          setState({
            status: "error",
            message: json.error ?? "Lookup failed",
            code: json.code,
          });
          return;
        }
        setState({ status: "success", data: json.data });
      } catch {
        setState({ status: "error", message: "Network error" });
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [mcInput]);

  return state;
}
