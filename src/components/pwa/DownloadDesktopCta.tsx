"use client";

import { Download, Monitor } from "lucide-react";
import { usePwaInstallPrompt } from "@/lib/hooks/usePwaInstallPrompt";

const MD_BREAKPOINT_PX = 768;

/**
 * Desktop / tablet CTA to install the PWA. Hidden below `md` via Tailwind and
 * early return when the viewport is narrow (no render on phones).
 */
export function DownloadDesktopCta() {
  const { isWideEnough, isStandalone, deferredPrompt, promptInstall } =
    usePwaInstallPrompt(MD_BREAKPOINT_PX);

  if (isStandalone || !isWideEnough) {
    return null;
  }

  const canInstall = deferredPrompt != null;

  return (
    <section
      className="hidden md:block border-y border-[#007bff]/20 bg-gradient-to-r from-[#007bff]/[0.12] via-[#121416]/90 to-[#007bff]/[0.08] px-6 py-5 backdrop-blur-sm"
      aria-label="Install desktop app"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row sm:gap-8">
        <div className="flex items-start gap-3 text-center sm:text-left">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#007bff]/30 bg-[#007bff]/15 text-[#5aa9ff]">
            <Monitor className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">
              NexusFreight for desktop
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">
              {canInstall
                ? "Install the app for a focused window, faster return visits, and the same control center—without browser tabs."
                : "Use Chrome or Edge and install from the menu for a dedicated desktop window. Safari: Share → Add to Dock / Home Screen."}
            </p>
          </div>
        </div>

        {canInstall ? (
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-[#007bff]/45 bg-[#007bff] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(0,123,255,0.35)] transition hover:border-[#3395ff] hover:bg-[#1a8cff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3395ff]"
          >
            <Download className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            Download desktop app
          </button>
        ) : (
          <p className="shrink-0 text-center text-xs font-medium text-slate-500 sm:max-w-[200px] sm:text-right">
            Look for “Install” in your browser’s menu when this site is open.
          </p>
        )}
      </div>
    </section>
  );
}
