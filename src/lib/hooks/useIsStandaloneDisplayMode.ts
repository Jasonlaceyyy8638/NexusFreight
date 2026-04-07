"use client";

import { useSyncExternalStore } from "react";

function getStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return Boolean(
    (navigator as Navigator & { standalone?: boolean }).standalone
  );
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * True when the app runs as an installed PWA (standalone / fullscreen display mode).
 */
export function useIsStandaloneDisplayMode(): boolean {
  return useSyncExternalStore(subscribe, getStandalone, () => false);
}
