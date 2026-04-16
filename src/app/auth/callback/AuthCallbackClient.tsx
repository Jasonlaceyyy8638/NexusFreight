"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/driver/dashboard";
}

function assign(href: string) {
  if (typeof window === "undefined") return;
  window.location.assign(href);
}

/**
 * Handles both PKCE (`?code=`) and implicit / magic-link (`#access_token=`) returns.
 * Uses `window.location.assign` instead of `router.replace` so we never dispatch
 * a router action before the App Router has finished initializing (Next.js 15+).
 */
export function AuthCallbackClient() {
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const supabase = createClient();
      const search = new URLSearchParams(window.location.search);
      const nextPath = safeNext(search.get("next"));
      const loginWithError = (msg: string) =>
        assign(
          `/auth/login?next=${encodeURIComponent(nextPath)}&error=${encodeURIComponent(msg)}`
        );

      if (!supabase) {
        setMessage("Configuration error.");
        loginWithError("Supabase is not configured.");
        return;
      }

      /** Some Supabase redirects put OAuth errors in the hash instead of the query. */
      const hashRaw = window.location.hash.replace(/^#/, "");
      const hashParams = hashRaw ? new URLSearchParams(hashRaw) : null;
      const hashOAuthErr =
        hashParams?.get("error_description")?.trim() ||
        hashParams?.get("error")?.trim();
      if (hashOAuthErr && !hashParams?.get("access_token")) {
        loginWithError(hashOAuthErr);
        return;
      }

      const oauthErr =
        search.get("error_description")?.trim() ||
        search.get("error")?.trim();
      if (oauthErr) {
        loginWithError(oauthErr);
        return;
      }

      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          loginWithError(error.message);
          return;
        }
        assign(nextPath);
        return;
      }

      const hash = hashRaw;
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (cancelled) return;
          if (error) {
            loginWithError(error.message);
            return;
          }
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}`
          );
          assign(nextPath);
          return;
        }
      }

      if (cancelled) return;
      loginWithError(
        "Missing auth code or tokens in the link. If you already finished signup, sign in with your email and password instead."
      );
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center bg-[#0D0E10] px-4 text-center text-sm text-slate-400">
      <p className="text-slate-300">{message}</p>
    </div>
  );
}
