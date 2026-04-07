"use client";

import { useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import type { QuickFireTemplateType } from "@/lib/sms/quick-fire-templates";
import type { Load } from "@/types/database";

type Props = {
  load: Pick<Load, "id" | "driver_id" | "status">;
  allowDispatch: boolean;
  onMessage?: (msg: string | null) => void;
  /** After a successful send (and context refresh). */
  onSuccess?: () => void;
  className?: string;
};

export function LoadQuickAlertButtons({
  load,
  allowDispatch,
  onMessage,
  onSuccess,
  className,
}: Props) {
  const { interactiveDemo, openDemoAccountGate, updateLoadStatus, refresh } =
    useDashboardData();
  const [busy, setBusy] = useState(false);

  const send = async (
    templateType: QuickFireTemplateType,
    newTime?: string
  ) => {
    if (interactiveDemo) {
      onMessage?.(
        templateType === "dispatch"
          ? 'Demo preview: a "new load" text would go to this driver\'s phone. No SMS is sent here.'
          : templateType === "cancelled"
            ? "Demo preview: a cancellation text would go to the driver. No SMS is sent here."
            : "Demo preview: a delay update would go to the driver. No SMS is sent here."
      );
      openDemoAccountGate();
      return;
    }
    if (!load.driver_id) return;
    setBusy(true);
    onMessage?.(null);
    try {
      const res = await fetch("/api/dispatch/quick-fire-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loadId: load.id,
          templateType,
          ...(templateType === "delayed" ? { newTime: newTime ?? "" } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        onMessage?.(
          typeof body.error === "string" ? body.error : "Quick Alert failed."
        );
        return;
      }
      if (templateType === "cancelled") {
        await updateLoadStatus(load.id, "cancelled");
      }
      await refresh();
      onMessage?.(
        templateType === "dispatch"
          ? "Dispatch alert sent."
          : templateType === "cancelled"
            ? "Cancelled alert sent. Load marked cancelled."
            : "Delay alert sent."
      );
      onSuccess?.();
    } catch (e) {
      onMessage?.(e instanceof Error ? e.message : "Quick Alert failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!allowDispatch) {
    return (
      <p className="text-xs text-slate-500">Requires dispatch permission.</p>
    );
  }

  if (!load.driver_id) {
    return (
      <p className="text-xs text-slate-500">
        Assign a driver on this load to send Quick Alerts.
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void send("dispatch")}
        className="rounded-md border border-amber-500/40 bg-[#1a1510] px-2.5 py-1.5 text-xs font-medium text-amber-100 hover:bg-[#221a14] disabled:cursor-not-allowed disabled:opacity-50"
      >
        New load alert
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void send("cancelled")}
        className="rounded-md border border-amber-500/40 bg-[#1a1510] px-2.5 py-1.5 text-xs font-medium text-amber-100 hover:bg-[#221a14] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancelled
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          const nt = window.prompt("New pickup window?", "");
          if (nt === null) return;
          void send("delayed", nt);
        }}
        className="rounded-md border border-amber-500/40 bg-[#1a1510] px-2.5 py-1.5 text-xs font-medium text-amber-100 hover:bg-[#221a14] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Delayed
      </button>
    </div>
  );
}
