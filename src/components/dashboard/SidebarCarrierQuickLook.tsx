"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { CopyableSlateValue } from "@/components/dashboard/CopyableSlateValue";

function authorityLabel(active: boolean | null | undefined) {
  if (active === true) return "Active (FMCSA)";
  if (active === false) return "Inactive (FMCSA)";
  return "Unknown";
}

export function SidebarCarrierQuickLook() {
  const { carriers } = useDashboardData();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return carriers.slice(0, 8);
    return carriers.filter((c) => c.name.toLowerCase().includes(s)).slice(0, 12);
  }, [carriers, q]);

  return (
    <div className="border-b border-white/10 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-[#16181A]/80 px-2.5 py-2 text-left text-xs text-slate-400 transition-colors hover:border-[#007bff]/35 hover:bg-white/5 hover:text-slate-200"
        aria-expanded={open}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={2} />
        <span className="font-medium">Carrier quick look</span>
      </button>

      {open ? (
        <div className="mt-2 rounded-lg border border-white/10 bg-[#121416] p-2 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-1">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type carrier name…"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#16181A] px-2 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded p-1 text-slate-500 hover:bg-white/10 hover:text-slate-300"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-center text-[11px] text-slate-500">
                No matches.
              </li>
            ) : (
              filtered.map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-transparent px-2 py-2 hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <p className="truncate text-xs font-semibold text-slate-200">
                    {c.name}
                  </p>
                  <div className="mt-1 flex flex-col gap-0.5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-8 shrink-0 text-slate-600">MC</span>
                      <CopyableSlateValue
                        value={c.mc_number}
                        copyLabel="MC number"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-8 shrink-0 text-slate-600">DOT</span>
                      <CopyableSlateValue
                        value={c.dot_number}
                        copyLabel="DOT number"
                      />
                    </div>
                    <p className="text-slate-500">
                      Authority:{" "}
                      <span
                        className={
                          c.is_active_authority === true
                            ? "text-emerald-400/90"
                            : c.is_active_authority === false
                              ? "text-amber-400/90"
                              : "text-slate-500"
                        }
                      >
                        {authorityLabel(c.is_active_authority)}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-600">
                      Insurance: not stored — verify on your load board / RMIS.
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
