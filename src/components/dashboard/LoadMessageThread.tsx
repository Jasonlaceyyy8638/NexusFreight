"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LoadMessage } from "@/types/database";

type Row = LoadMessage & {
  profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
};

type Props = {
  loadId: string;
  orgId: string;
};

export function LoadMessageThread({ loadId, orgId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("load_messages")
      .select("id, load_id, org_id, sender_user_id, body, created_at, profiles(full_name)")
      .eq("load_id", loadId)
      .order("created_at", { ascending: true });
    if (error) {
      setErr(error.message);
      return;
    }
    setRows((data as unknown as Row[]) ?? []);
    setErr(null);
  }, [supabase, loadId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(`load-messages-${loadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "load_messages",
          filter: `load_id=eq.${loadId}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, loadId, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rows.length]);

  async function send() {
    if (!supabase) return;
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setErr(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setErr("Not signed in.");
      return;
    }
    const { error } = await supabase.from("load_messages").insert({
      load_id: loadId,
      org_id: orgId,
      sender_user_id: user.id,
      body,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setText("");
    void load();
  }

  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-[#121416] p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        In-app messages
      </h2>
      <p className="text-xs leading-relaxed text-slate-500">
        Messages are visible to dispatch and the assigned driver in Nexus Driver.
        Keep updates operational (ETA, door, delays).
      </p>

      <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-[#0f1012] p-3">
        {rows.length === 0 ? (
          <p className="text-center text-xs text-slate-500">No messages yet.</p>
        ) : (
          rows.map((m) => (
            <div key={m.id} className="rounded-md border border-white/5 bg-[#16181A] px-3 py-2">
              <p className="text-[10px] text-slate-500">
                {(() => {
                  const p = m.profiles;
                  const name = Array.isArray(p)
                    ? p[0]?.full_name
                    : p?.full_name;
                  return (name ?? "User").trim() || "User";
                })()}{" "}
                ·{" "}
                {new Date(m.created_at).toLocaleString(undefined, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{m.body}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message to the driver…"
          rows={3}
          className="min-h-[72px] flex-1 resize-y rounded-lg border border-white/10 bg-[#0f1012] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
          maxLength={4000}
        />
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={() => void send()}
          className="min-h-[44px] shrink-0 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>

      {err ? (
        <p className="text-center text-xs text-red-400" role="alert">
          {err}
        </p>
      ) : null}
    </section>
  );
}
