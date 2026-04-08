"use client";

import { useSyncExternalStore } from "react";

/**
 * True when the session is running in an installed / standalone shell (PWA),
 * used as a proxy for the native NexusFreight driver app. Hide web-only store
 * badges in that case.
 */
function isStandaloneShell(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const list: Array<{ mq: MediaQueryList; fn: () => void }> = [];
  const mq = window.matchMedia("(display-mode: standalone)");
  const fn = () => onChange();
  mq.addEventListener("change", fn);
  list.push({ mq, fn });
  window.addEventListener("focus", fn);
  return () => {
    mq.removeEventListener("change", fn);
    window.removeEventListener("focus", fn);
  };
}

export function useNexusNativeDriverShell(): boolean {
  return useSyncExternalStore(
    subscribe,
    isStandaloneShell,
    () => false
  );
}
