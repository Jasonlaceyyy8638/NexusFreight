"use client";

import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import type { InteractiveDemoVariant } from "@/lib/demo_data";

/**
 * Lets the corporate support login (info@) flip between dispatcher vs carrier
 * interactive sandbox data without a paid customer workspace.
 */
export function CorporateSandboxSwitcher() {
  const { corporateSandboxPreview, interactiveDemoVariant, refresh } =
    useDashboardData();

  if (!corporateSandboxPreview || !interactiveDemoVariant) return null;

  function setVariant(v: InteractiveDemoVariant) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("nexus_corporate_sandbox", v);
    }
    void refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-b border-violet-500/20 bg-violet-950/25 px-3 py-2 text-[11px] text-violet-100/95 backdrop-blur-sm sm:text-xs">
      <span className="font-medium text-violet-200/90">Preview mode</span>
      <span className="text-violet-300/70">|</span>
      <button
        type="button"
        onClick={() => setVariant("dispatcher")}
        className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
          interactiveDemoVariant === "dispatcher"
            ? "bg-violet-600/50 text-white"
            : "text-violet-200/80 hover:bg-white/10"
        }`}
      >
        Dispatcher
      </button>
      <button
        type="button"
        onClick={() => setVariant("carrier")}
        className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
          interactiveDemoVariant === "carrier"
            ? "bg-violet-600/50 text-white"
            : "text-violet-200/80 hover:bg-white/10"
        }`}
      >
        Carrier
      </button>
    </div>
  );
}
