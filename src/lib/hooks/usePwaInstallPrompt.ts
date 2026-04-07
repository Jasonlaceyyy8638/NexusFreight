"use client";

import { useCallback, useEffect, useState } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Chromium/Edge PWA install prompt + viewport width gate + standalone detection.
 * Safari does not fire `beforeinstallprompt`; `deferredPrompt` stays null there.
 */
export function usePwaInstallPrompt(minWidthPx: number) {
  const [isWideEnough, setIsWideEnough] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidthPx}px)`);
    const updateWide = () => setIsWideEnough(mq.matches);
    updateWide();
    mq.addEventListener("change", updateWide);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    setIsStandalone(standalone);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    return () => {
      mq.removeEventListener("change", updateWide);
      window.removeEventListener("beforeinstallprompt", onBip);
    };
  }, [minWidthPx]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return {
    isWideEnough,
    isStandalone,
    deferredPrompt,
    promptInstall,
  };
}
