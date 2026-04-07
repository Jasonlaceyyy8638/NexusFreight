"use client";

import { useSyncExternalStore } from "react";

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(max-width: 767px)").matches) return true;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(max-width: 767px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * True when the driver app should treat the session as mobile (narrow viewport or mobile UA).
 */
export function useDriverMobileDevice(): boolean {
  // Mobile-first SSR: avoid flashing the desktop QR gate before hydration on phones.
  return useSyncExternalStore(subscribe, isMobileDevice, () => true);
}
