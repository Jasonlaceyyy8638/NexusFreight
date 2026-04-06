"use client";

import {
  DRIVER_ROSTER_STATUSES,
  driverRosterLabel,
} from "@/lib/driver-roster-status";
import type { DriverRosterStatus } from "@/types/database";

type Props = {
  value: DriverRosterStatus;
  onChange: (next: DriverRosterStatus) => void;
  disabled?: boolean;
  /** Compact pills (add modal); false = full-width row */
  compact?: boolean;
};

export function DriverRosterStatusPicker({
  value,
  onChange,
  disabled,
  compact = true,
}: Props) {
  return (
    <div
      className={
        compact
          ? "flex flex-wrap gap-2"
          : "grid gap-2 sm:grid-cols-3"
      }
      role="group"
      aria-label="Driver status"
    >
      {DRIVER_ROSTER_STATUSES.map((s) => {
        const on = value === s;
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s)}
            className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors disabled:opacity-40 ${
              on
                ? "border-[#007bff] bg-[#007bff]/20 text-white shadow-[0_0_16px_rgba(0,123,255,0.25)]"
                : "border-white/15 bg-[#121416] text-slate-400 hover:border-white/25 hover:text-slate-200"
            }`}
          >
            {driverRosterLabel(s)}
          </button>
        );
      })}
    </div>
  );
}
