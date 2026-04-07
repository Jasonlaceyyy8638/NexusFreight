"use client";

import { Download } from "lucide-react";
import { usePwaInstallPrompt } from "@/lib/hooks/usePwaInstallPrompt";

const SIDEBAR_MIN_WIDTH_PX = 1024;

/**
 * Desktop-only control to trigger the browser PWA install prompt (Chromium/Edge).
 * Safari does not fire `beforeinstallprompt`; button stays hidden until criteria are met.
 */
export function SidebarPwaInstallButton() {
  const { isWideEnough, isStandalone, deferredPrompt, promptInstall } =
    usePwaInstallPrompt(SIDEBAR_MIN_WIDTH_PX);

  if (!isWideEnough || isStandalone || !deferredPrompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      className="mb-2 flex w-full items-center justify-center gap-2 rounded-md border border-[#007bff]/35 bg-[#007bff]/12 px-3 py-2 text-xs font-semibold text-[#5aa9ff] transition-colors hover:border-[#007bff]/55 hover:bg-[#007bff]/20"
    >
      <Download className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      Download Desktop App
    </button>
  );
}
