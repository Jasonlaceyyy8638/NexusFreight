"use client";

import { useIsStandaloneDisplayMode } from "@/lib/hooks/useIsStandaloneDisplayMode";

export function DashboardDesktopOptimizedFooter() {
  const standalone = useIsStandaloneDisplayMode();
  if (!standalone) return null;

  return (
    <footer className="mt-10 flex justify-center border-t border-white/[0.06] pt-8 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <span
        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500"
        title="Installed app experience is tuned for desktop layouts"
      >
        Desktop Optimized
      </span>
    </footer>
  );
}
