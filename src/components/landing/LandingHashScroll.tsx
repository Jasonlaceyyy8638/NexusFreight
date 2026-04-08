"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Next.js client navigation to `/#pricing` does not scroll to the element.
 * Run after paint when the home route loads with hash #pricing.
 */
export function LandingHashScroll() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname !== "/") return;
    if (window.location.hash !== "#pricing") return;
    const el = document.getElementById("pricing");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pathname]);

  useLayoutEffect(() => {
    if (pathname !== "/") return;
    const onHashChange = () => {
      if (window.location.hash !== "#pricing") return;
      document.getElementById("pricing")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [pathname]);

  return null;
}
