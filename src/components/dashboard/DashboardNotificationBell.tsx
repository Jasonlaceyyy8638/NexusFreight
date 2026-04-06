"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export function DashboardNotificationBell() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) {
      setRows([]);
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("dashboard_notifications")
      .select("id, title, body, created_at")
      .eq("profile_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      setRows([]);
    } else {
      setRows((data as Row[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void load(), 90_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [load]);

  const markRead = useCallback(
    async (id: string) => {
      if (!supabase) return;
      await supabase
        .from("dashboard_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      void load();
    },
    [supabase, load]
  );

  if (!supabase) {
    return null;
  }

  const count = rows.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void load();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3B82F6] px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[120] cursor-default bg-transparent"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-[130] mt-2 w-[min(100vw-2rem,20rem)] rounded-xl border border-white/10 bg-[#16181A] py-2 shadow-2xl">
            <p className="border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Notifications
            </p>
            {loading ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">
                Loading…
              </p>
            ) : rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">
                No new notifications
              </p>
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="border-b border-white/[0.06] last:border-0"
                  >
                    <button
                      type="button"
                      onClick={() => void markRead(r.id)}
                      className="w-full px-3 py-2.5 text-left text-xs hover:bg-white/5"
                    >
                      <span className="font-semibold text-slate-200">
                        {r.title}
                      </span>
                      <span className="mt-0.5 block text-slate-500">
                        {r.body}
                      </span>
                      <span className="mt-1 block text-[10px] text-slate-600">
                        {new Date(r.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
