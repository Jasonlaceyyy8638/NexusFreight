"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BetaSupportBanner } from "@/components/support/BetaSupportBanner";

/**
 * Marketing / dashboard chrome. Driver mobile routes hide the global beta strip and top offset.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDriverRoute = pathname.startsWith("/driver");

  /**
   * Supabase magic links may land on Site URL with `#access_token=...`. Forward to
   * `/auth/callback` so the callback page can `setSession` (hash is never sent to the server).
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (pathname === "/auth/callback" || pathname.startsWith("/auth/callback/")) {
      return;
    }

    const search = window.location.search;
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(search);

    /** PKCE or OAuth error query (Supabase may fall back to Site URL root). */
    const hasPkceCode = searchParams.has("code");
    const hasOAuthError =
      searchParams.has("error") &&
      (searchParams.has("error_description") || searchParams.has("error_code"));
    if (pathname === "/" && (hasPkceCode || hasOAuthError)) {
      window.location.replace(`/auth/callback${search}${hash}`);
      return;
    }

    if (!hash || hash.length < 12) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const hasAuthFragment =
      params.has("access_token") ||
      params.get("type") === "invite" ||
      params.get("type") === "magiclink" ||
      params.get("type") === "signup" ||
      params.get("type") === "recovery";

    if (!hasAuthFragment) return;

    window.location.replace(`/auth/callback${search}${hash}`);
  }, [pathname]);

  return (
    <>
      {!isDriverRoute && <BetaSupportBanner />}
      <div
        suppressHydrationWarning
        className={
          isDriverRoute
            ? "flex min-h-[100dvh] flex-1 flex-col"
            : "flex min-h-[100dvh] flex-1 flex-col pt-10"
        }
      >
        {children}
      </div>
    </>
  );
}
