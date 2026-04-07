"use client";

import { useEffect } from "react";

/**
 * Registers `/service-worker.js` in production for caching (PWA).
 */
export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/" })
      .catch(() => {
        /* ignore */
      });
  }, []);

  return null;
}
