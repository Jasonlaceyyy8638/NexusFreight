"use client";

import type { AdminAuditRow } from "@/app/api/admin/audit-log/route";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function AdminAuditLog() {
  const [rows, setRows] = useState<AdminAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/audit-log?limit=300", {
        credentials: "include",
      });
      if (res.status === 404) {
        setErr("Unauthorized.");
        setRows([]);
        return;
      }
      const data = (await res.json()) as {
        events?: AdminAuditRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data.events ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (err) {
    return <p className="mt-6 text-sm text-red-400">{err}</p>;
  }

  return (
    <>
      <ul className="mt-10 space-y-3 md:hidden" aria-label="Audit log">
        {rows.length === 0 ? (
          <li className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center text-sm text-slate-500">
            No audit events yet. Loads (after migration), MC lookups (signed-in),
            and driver invites appear here.
          </li>
        ) : (
          rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs"
            >
              <p className="text-slate-400">
                {new Date(r.created_at).toLocaleString()}
              </p>
              <p className="mt-1 font-mono text-sm text-sky-300">{r.event_type}</p>
              <p className="mt-2 break-all font-mono text-[10px] text-slate-500">
                Actor: {r.actor_user_id ?? "—"}
              </p>
              <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
                Org: {r.org_id ?? "—"}
              </p>
              <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-all rounded border border-slate-800 bg-slate-950/80 p-2 font-mono text-[10px] text-slate-400">
                {JSON.stringify(r.metadata ?? {}, null, 0)}
              </pre>
            </li>
          ))
        )}
      </ul>

      <div className="mt-10 hidden rounded-xl border border-slate-800 bg-slate-900/50 md:block">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No audit events yet. Loads (after migration), MC lookups (signed-in), and
            driver invites appear here.
          </p>
        ) : (
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Org</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-800/80 last:border-0 hover:bg-slate-900/80"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-sky-300">
                      {r.event_type}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 font-mono text-[10px] text-slate-500">
                      {r.actor_user_id ?? "—"}
                    </td>
                    <td className="max-w-[120px] truncate px-4 py-3 font-mono text-[10px] text-slate-500">
                      {r.org_id ?? "—"}
                    </td>
                    <td className="max-w-xl px-4 py-3 font-mono text-[10px] text-slate-400">
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(r.metadata ?? {}, null, 0)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
