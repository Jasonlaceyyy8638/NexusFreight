"use client";

import { AnnouncementsAnalyticsDashboard } from "@/components/admin/AnnouncementsAnalyticsDashboard";
import type { AnnouncementsAnalyticsDashboardData } from "@/types/announcements-analytics-dashboard";
import { BarChart3, CheckCircle2, Loader2, Megaphone, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PerformanceSend = {
  id: string;
  title: string;
  sent_at: string;
  total_sent: number;
  unique_opens: number;
  unique_clicks: number;
  open_rate_pct: number;
  ctr_pct: number;
};

type PerformanceOpener = {
  user_id: string;
  opened_at: string;
  auth_email: string | null;
  full_name: string | null;
};

export function AnnouncementsClient() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [recipients, setRecipients] = useState<{
    count: number;
    emails: string[];
  } | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{
    recipient_count: number;
    attempted: number;
  } | null>(null);
  const [testDone, setTestDone] = useState<string | null>(null);
  const [perfSends, setPerfSends] = useState<PerformanceSend[]>([]);
  const [perfSelected, setPerfSelected] = useState<PerformanceSend | null>(null);
  const [perfOpeners, setPerfOpeners] = useState<PerformanceOpener[]>([]);
  const [perfSendId, setPerfSendId] = useState<string | null>(null);
  const [loadingPerf, setLoadingPerf] = useState(true);
  const [analyticsData, setAnalyticsData] =
    useState<AnnouncementsAnalyticsDashboardData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [sendAudience, setSendAudience] = useState<"all" | "inactive_7d">("all");

  const loadAnalyticsDashboard = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch("/api/admin/announcements/analytics-dashboard", {
        credentials: "include",
      });
      const j = (await res.json()) as AnnouncementsAnalyticsDashboardData & {
        error?: string;
      };
      if (!res.ok) {
        setAnalyticsData(null);
        return;
      }
      setAnalyticsData(j);
    } catch {
      setAnalyticsData(null);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalyticsDashboard();
  }, [loadAnalyticsDashboard]);

  const loadRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      const res = await fetch("/api/admin/announcements/recipients", {
        credentials: "include",
      });
      const j = (await res.json()) as {
        count?: number;
        emails?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(j.error || "Failed to load recipients");
      setRecipients({
        count: j.count ?? 0,
        emails: j.emails ?? [],
      });
    } catch {
      setRecipients(null);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  const loadPerformance = useCallback(async (id: string | null) => {
    setLoadingPerf(true);
    try {
      const q = id ? `?id=${encodeURIComponent(id)}` : "";
      const res = await fetch(`/api/admin/announcements/performance${q}`, {
        credentials: "include",
      });
      const j = (await res.json()) as {
        sends?: PerformanceSend[];
        selected?: PerformanceSend | null;
        openers?: PerformanceOpener[];
        error?: string;
      };
      if (!res.ok) {
        setPerfSends([]);
        setPerfSelected(null);
        setPerfOpeners([]);
        return;
      }
      setPerfSends(j.sends ?? []);
      setPerfSelected(j.selected ?? null);
      setPerfOpeners(j.openers ?? []);
    } catch {
      setPerfSends([]);
      setPerfSelected(null);
      setPerfOpeners([]);
    } finally {
      setLoadingPerf(false);
    }
  }, []);

  useEffect(() => {
    void loadPerformance(perfSendId);
  }, [perfSendId, loadPerformance]);

  useEffect(() => {
    const t = title.trim();
    const b = body.trim();
    if (!t && !b) {
      setPreviewHtml(null);
      return;
    }
    setLoadingPreview(true);
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/admin/announcements/preview-html", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: t || "Preview title",
              body: b || "Your update will appear here.",
            }),
          });
          const j = (await res.json()) as { html?: string; error?: string };
          if (!res.ok) throw new Error(j.error || "Preview failed");
          setPreviewHtml(j.html ?? "");
        } catch {
          setPreviewHtml(null);
        } finally {
          setLoadingPreview(false);
        }
      })();
    }, 400);
    return () => window.clearTimeout(handle);
  }, [title, body]);

  const send = useCallback(async () => {
    setErr(null);
    setDone(null);
    setTestDone(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/announcements/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          confirmPhrase,
          audience: sendAudience,
        }),
      });
      const j = (await res.json()) as {
        error?: string;
        code?: string;
        ok?: boolean;
        recipient_count?: number;
        attempted?: number;
        announcement_id?: string;
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
      setSendAudience("all");
      void loadRecipients();
      void loadAnalyticsDashboard();
      if (typeof j.announcement_id === "string" && j.announcement_id) {
        setPerfSendId(j.announcement_id);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }, [
    title,
    body,
    confirmPhrase,
    sendAudience,
    loadRecipients,
    loadAnalyticsDashboard,
  ]);

  const prepareReengagementBlast = useCallback(() => {
    setErr(null);
    setSendAudience("inactive_7d");
    setTitle("We'd love to see you back on NexusFreight");
    setBody(
      [
        "It's been a little while since you opened one of our product updates.",
        "",
        "Jump into your dashboard for the latest dispatch tools, carrier workflows, and settlement features — or reply if you need a hand from the team.",
        "",
        "Thanks for being part of NexusFreight.",
      ].join("\n\n")
    );
    window.requestAnimationFrame(() => {
      document.getElementById("ann-composer")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const sendTest = useCallback(async () => {
    setErr(null);
    setTestDone(null);
    setDone(null);
    if (!title.trim() || !body.trim()) {
      setErr("Add a title and body before sending a test.");
      return;
    }
    setTestBusy(true);
    try {
      const res = await fetch("/api/admin/announcements/test-send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const j = (await res.json()) as { error?: string; ok?: boolean; to?: string };
      if (!res.ok) {
        setErr(j.error || "Test send failed.");
        return;
      }
      setTestDone(j.to ?? "your inbox");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Test send failed.");
    } finally {
      setTestBusy(false);
    }
  }, [title, body]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
        Internal
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Megaphone className="h-8 w-8 text-sky-400" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Product announcements
        </h1>
      </div>

      <div className="mt-8">
        <AnnouncementsAnalyticsDashboard
          data={analyticsData}
          loading={loadingAnalytics}
          onReengagementBlast={prepareReengagementBlast}
        />
      </div>

      <p className="mt-10 max-w-3xl text-sm text-slate-400">
        Recipients are <strong className="text-slate-300">profiles</strong> who have
        not opted out, with email from{" "}
        <code className="text-slate-300">profiles.auth_email</code> when set, otherwise
        the Auth signup email. Preview updates as you type; bulk send uses Resend from
        the Next.js API.
      </p>

      <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
        {loadingRecipients ? (
          <span className="text-slate-500">Loading recipient list…</span>
        ) : recipients ? (
          <>
            <p>
              <strong className="text-white">{recipients.count}</strong> recipients
              (deduped by email, excluding opt-outs).
            </p>
            {recipients.emails.length > 0 ? (
              <ul className="mt-3 max-h-36 list-inside list-disc overflow-y-auto rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2 font-mono text-xs text-slate-400">
                {recipients.emails.map((em) => (
                  <li key={em}>{em}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-amber-200/90">
                No eligible recipients — every profile is opted out, or has no valid
                email on the profile or in Auth.
              </p>
            )}
          </>
        ) : (
          "Could not load recipients."
        )}
      </div>

      <div className="mt-8 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <BarChart3 className="h-5 w-5 text-sky-400" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Performance
          </h2>
          {perfSends.length > 0 ? (
            <label className="ml-auto flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="whitespace-nowrap">Announcement</span>
              <select
                className="max-w-[min(100vw-4rem,320px)] rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
                value={
                  perfSendId && perfSends.some((s) => s.id === perfSendId)
                    ? perfSendId
                    : (perfSends[0]?.id ?? "")
                }
                onChange={(e) => {
                  setPerfSendId(e.target.value);
                }}
              >
                {perfSends.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.sent_at).toLocaleString()} — {s.title.slice(0, 48)}
                    {s.title.length > 48 ? "…" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {loadingPerf ? (
          <p className="mt-3 text-sm text-slate-500">Loading analytics…</p>
        ) : perfSends.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No sends logged yet. After a bulk send completes, opens and clicks appear
            here (HTML email only; plain-text clients are not counted for opens).
          </p>
        ) : perfSelected ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total sent
                </p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {perfSelected.total_sent}
                </p>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Open rate
                </p>
                <p className="mt-1 text-xl font-semibold text-emerald-300">
                  {perfSelected.open_rate_pct}%
                </p>
                <p className="text-[11px] text-slate-500">
                  {perfSelected.unique_opens} unique / {perfSelected.total_sent}
                </p>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Click-through
                </p>
                <p className="mt-1 text-xl font-semibold text-sky-300">
                  {perfSelected.ctr_pct}%
                </p>
                <p className="text-[11px] text-slate-500">
                  {perfSelected.unique_clicks} unique / {perfSelected.total_sent}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Users who opened
              </p>
              {perfOpeners.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No opens recorded for this send yet.
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-md border border-slate-800">
                  <table className="w-full min-w-[480px] text-left text-xs text-slate-300">
                    <thead className="border-b border-slate-800 bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Email</th>
                        <th className="px-3 py-2 font-semibold">Name</th>
                        <th className="px-3 py-2 font-semibold">Opened at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfOpeners.map((o) => (
                        <tr
                          key={`${o.user_id}-${o.opened_at}`}
                          className="border-b border-slate-800/80 last:border-0"
                        >
                          <td className="px-3 py-2 font-mono text-slate-400">
                            {o.auth_email ?? "—"}
                          </td>
                          <td className="px-3 py-2">{o.full_name ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-400">
                            {new Date(o.opened_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div
        id="ann-composer"
        className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start scroll-mt-24"
      >
        <div className="min-w-0 flex-1 space-y-6">
          {sendAudience === "inactive_7d" ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
              <strong className="text-amber-50">Re-engagement mode:</strong> the next
              bulk send goes only to users listed as inactive (no tracked open in 7
              days). Type SEND to confirm, or refresh the page to reset to all
              recipients.
            </div>
          ) : null}
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
              rows={14}
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
              Type <strong className="text-slate-300">SEND</strong> to confirm bulk
              send
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

          {testDone ? (
            <p className="text-sm text-sky-300" role="status">
              Test email sent to {testDone}.
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

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={testBusy || !title.trim() || !body.trim()}
              onClick={() => void sendTest()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {testBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send test email
            </button>
            <button
              type="button"
              disabled={
                busy || !title.trim() || !body.trim() || !confirmPhrase.trim()
              }
              onClick={() => void send()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-900/30 hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : sendAudience === "inactive_7d" ? (
                "Send re-engagement blast (inactive only)"
              ) : (
                "Send to all listed recipients"
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            <strong className="text-slate-400">Safety:</strong> duplicate
            title+body blocked within one hour. Set{" "}
            <code className="text-slate-400">ANNOUNCEMENT_SEND_CONFIRM_PHRASE</code>{" "}
            to change the bulk-send phrase. Unsubscribe links are signed per profile;{" "}
            <code className="text-slate-400">NEXUSFREIGHT_POSTAL_ADDRESS</code>{" "}
            customizes the footer.
          </p>
        </div>

        <div className="w-full min-w-0 flex-1 lg:max-w-[min(100%,560px)] lg:sticky lg:top-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Live preview
          </p>
          <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-inner">
            {loadingPreview ? (
              <div className="flex h-[min(70vh,640px)] items-center justify-center text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : previewHtml ? (
              <iframe
                title="Email preview"
                className="h-[min(70vh,640px)] w-full bg-white"
                srcDoc={previewHtml}
              />
            ) : (
              <div className="flex h-[min(70vh,640px)] items-center justify-center px-4 text-center text-sm text-slate-500">
                Type a title or body to generate preview.
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-12 text-sm">
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
