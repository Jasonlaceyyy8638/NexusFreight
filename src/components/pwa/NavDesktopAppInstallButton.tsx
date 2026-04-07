"use client";

import { Download } from "lucide-react";
import { usePwaInstallPrompt } from "@/lib/hooks/usePwaInstallPrompt";

const MD_BREAKPOINT_PX = 768;

/**
 * Ghost nav control for Chromium/Edge PWA install. Hidden below `md` (Tailwind + viewport gate).
 */
export function NavDesktopAppInstallButton() {
  const { isWideEnough, isStandalone, deferredPrompt, promptInstall } =
    usePwaInstallPrompt(MD_BREAKPOINT_PX);

  if (isStandalone || !isWideEnough || !deferredPrompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      className="hidden items-center gap-1.5 rounded-md border border-white/15 bg-transparent px-2.5 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/25 hover:bg-white/[0.06] hover:text-white md:flex"
      aria-label="Install NexusFreight desktop app"
    >
      <Download
        className="h-4 w-4 shrink-0 text-[#007bff]"
        strokeWidth={2}
        aria-hidden
      />
      <span>Desktop App</span>
    </button>
  );
}
