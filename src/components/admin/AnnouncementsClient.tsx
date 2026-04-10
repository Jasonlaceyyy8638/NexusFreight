"use client";

import { CheckCircle2, Loader2, Megaphone } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function AnnouncementsClient() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [audience, setAudience] = useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{
    recipient_count: number;
    attempted: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingAudience(true);
      try {
        const res = await fetch("/api/admin/announcements/preview-count", {
          credentials: "include",
        });
        const j = (await res.json()) as { count?: number; error?: string };
        if (!cancelled && res.ok) setAudience(j.count ?? 0);
      } catch {
        if (!cancelled) setAudience(null);
      } finally {
        if (!cancelled) setLoadingAudience(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(async () => {
    setErr(null);
    setDone(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/announcements/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, confirmPhrase }),
      });
      const j = (await res.json()) as {
        error?: string;
        code?: string;
        ok?: boolean;
        recipient_count?: number;
        attempted?: number;
        errors?: string[];
      };
      if (!res.ok) {
        const fromList =
          Array.isArray(j.errors) && j.errors.length > 0
            ? j.errors.join("\n")
            : null;
        setErr(
          fromList ||
            (typeof j.error === "string" ? j.error : null) ||
            `Send failed (${res.status}).`
        );
        return;
      }
      if (!j.ok) {
        setErr(
          j.errors?.length
            ? j.errors.join("\n")
            : "No messages were delivered. Check Resend and logs."
        );
        return;
      }
      setDone({
        recipient_count: j.recipient_count ?? 0,
        attempted: j.attempted ?? 0,
      });
      setConfirmPhrase("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }, [title, body, confirmPhrase]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
        Internal
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Megaphone className="h-8 w-8 text-sky-400" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Product announcements
        </h1>
      </div>
      <p className="mt-3 text-sm text-slate-400">
        Send a product update to every account with an email in{" "}
        <strong className="text-slate-300">Supabase Auth</strong> (same source as
        login). Count uses <code className="text-slate-300">auth.admin.listUsers</code>
        , not <code className="text-slate-300">profiles.auth_email</code>, which is
        often empty. Delivery uses the{" "}
        <code className="text-slate-300">send-product-update</code> Edge Function
        and Resend.
      </p>

      <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
        {loadingAudience ? (
          <span className="text-slate-500">Estimating audience…</span>
        ) : audience !== null ? (
          <>
            <strong className="text-white">{audience}</strong> recipients match
            the filter (Auth users with email, deduped by address).
          </>
        ) : (
          "Could not load audience count."
        )}
      </div>

      <div className="mt-8 space-y-6">
        <div>
          <label
            htmlFor="ann-title"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Update title
          </label>
          <input
            id="ann-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50"
            placeholder="e.g. New dispatch shortcuts"
            maxLength={200}
            autoComplete="off"
          />
        </div>
        <div>
          <label
            htmlFor="ann-body"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Update body
          </label>
          <textarea
            id="ann-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm leading-relaxed text-white outline-none focus:border-sky-500/50"
            placeholder="Plain text. Paragraphs separated by a blank line."
            maxLength={20000}
          />
        </div>
        <div>
          <label
            htmlFor="ann-confirm"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Type <strong className="text-slate-300">SEND</strong> to confirm
            (or your configured phrase)
          </label>
          <input
            id="ann-confirm"
            type="text"
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50"
            placeholder="SEND"
            autoComplete="off"
          />
        </div>

        {err ? (
          <p className="text-sm text-red-400 whitespace-pre-wrap" role="alert">
            {err}
          </p>
        ) : null}

        {done ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-semibold text-white">Sent</p>
              <p className="mt-1 text-emerald-200/90">
                Delivered to {done.recipient_count} of {done.attempted}{" "}
                recipients.
              </p>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy || !title.trim() || !body.trim() || !confirmPhrase.trim()}
          onClick={() => void send()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-900/30 hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send to all registered users"
          )}
        </button>
        <p className="text-xs text-slate-500">
          <strong className="text-slate-400">Safety:</strong> same title+body
          cannot be sent twice within one hour. Edge Function requires the
          confirm phrase; set{" "}
          <code className="text-slate-400">ANNOUNCEMENT_SEND_CONFIRM_PHRASE</code>{" "}
          on the function to change it from the default{" "}
          <code className="text-slate-400">SEND</code>.
        </p>
      </div>

      <p className="mt-10 text-sm">
        <Link
          href="/admin/control-center"
          className="font-medium text-sky-400 hover:underline"
        >
          ← Back to Nexus Control
        </Link>
      </p>
    </div>
  );
}
