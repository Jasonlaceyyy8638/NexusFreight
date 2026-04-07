"use client";

import {
  AlertCircle,
  ImagePlus,
  LifeBuoy,
  Loader2,
  Paperclip,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { createClient } from "@/lib/supabase/client";
import { ticketPublicRef } from "@/lib/support/ticket-ref";
import type { SupportTicket, SupportTicketPriority } from "@/types/database";

const inputClass =
  "mt-1.5 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";

const PRIORITIES: { value: SupportTicketPriority; label: string }[] = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
];

function statusStyles(status: string) {
  switch (status) {
    case "Open":
      return "border-sky-500/35 bg-sky-950/30 text-sky-200";
    case "In Progress":
      return "border-amber-500/35 bg-amber-950/30 text-amber-200";
    case "Resolved":
      return "border-emerald-500/35 bg-emerald-950/25 text-emerald-200";
    default:
      return "border-white/15 bg-white/5 text-slate-300";
  }
}

export function DashboardSupportPage() {
  const supabase = createClient();
  const { interactiveDemo, usingDemo } = useDashboardData();
  const demo = interactiveDemo || usingDemo;

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<SupportTicketPriority>("Medium");
  const [file, setFile] = useState<File | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    if (!supabase || demo) {
      setTickets([]);
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select(
        "id, subject, description, status, priority, screenshot_url, created_at"
      )
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[support] list:", error.message);
      setTickets([]);
    } else {
      setTickets((data ?? []) as SupportTicket[]);
    }
    setLoadingList(false);
  }, [supabase, demo]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  async function openSignedUrl(path: string) {
    if (!supabase || demo) return;
    const { data, error } = await supabase.storage
      .from("support-tickets")
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    setFormMsg(null);
    if (demo) {
      setFormErr("Sign in with a full account to submit support tickets.");
      return;
    }
    if (!subject.trim() || !description.trim()) {
      setFormErr("Subject and description are required.");
      return;
    }

    setSubmitBusy(true);
    try {
      const body = new FormData();
      body.set("subject", subject.trim());
      body.set("description", description.trim());
      body.set("priority", priority);
      if (file) body.set("screenshot", file);

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        body,
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; ref?: string };

      if (!res.ok) {
        throw new Error(json.error || "Request failed.");
      }

      setFormMsg(
        json.ref
          ? `Ticket #${json.ref} received. Check your email for confirmation.`
          : "Ticket received. Check your email for confirmation."
      );
      setSubject("");
      setDescription("");
      setPriority("Medium");
      setFile(null);
      await loadTickets();
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Could not submit ticket.");
    } finally {
      setSubmitBusy(false);
    }
  }

  const activeTickets = tickets.filter((t) => t.status !== "Resolved");
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved");

  return (
    <div className="px-6 py-8 text-white">
      <div className="flex flex-wrap items-start gap-3">
        <div className="rounded-xl border border-[#007bff]/30 bg-[#007bff]/10 p-2.5">
          <LifeBuoy className="h-6 w-6 text-[#5aa9ff]" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Submit a ticket for help with NexusFreight. Attach a screenshot if
            it helps explain the issue. Our team is notified immediately.
          </p>
        </div>
      </div>

      {demo && (
        <div className="mt-6 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/95">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
          <p>
            Demo mode: ticket submission is disabled.{" "}
            <Link href="/auth/signup" className="font-semibold text-[#3395ff] hover:underline">
              Create an account
            </Link>{" "}
            to open real support requests.
          </p>
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            New ticket
          </h2>
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-4 space-y-4 rounded-xl border border-white/10 bg-[#16181A]/90 p-5"
          >
            <div>
              <label htmlFor="ticket-subject" className="text-xs font-medium text-slate-400">
                Subject
              </label>
              <input
                id="ticket-subject"
                className={inputClass}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                disabled={demo || submitBusy}
                maxLength={200}
                required
              />
            </div>
            <div>
              <label htmlFor="ticket-desc" className="text-xs font-medium text-slate-400">
                Description
              </label>
              <textarea
                id="ticket-desc"
                className={`${inputClass} min-h-[120px] resize-y`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened? What did you expect?"
                disabled={demo || submitBusy}
                maxLength={10000}
                required
              />
            </div>
            <div>
              <label htmlFor="ticket-priority" className="text-xs font-medium text-slate-400">
                Priority
              </label>
              <select
                id="ticket-priority"
                className={inputClass}
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as SupportTicketPriority)
                }
                disabled={demo || submitBusy}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">
                Screenshot (optional)
              </label>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 transition-colors hover:border-white/25 hover:bg-white/[0.07] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  <ImagePlus className="h-4 w-4 text-slate-400" aria-hidden />
                  Choose image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={demo || submitBusy}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {file && (
                  <span className="text-xs text-slate-500">{file.name}</span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-600">
                JPG, PNG, WebP, or GIF — max 5 MB.
              </p>
            </div>

            {formErr && (
              <p className="text-sm text-red-300">{formErr}</p>
            )}
            {formMsg && (
              <p className="text-sm text-emerald-300">{formMsg}</p>
            )}

            <button
              type="submit"
              disabled={demo || submitBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#007bff] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0066dd] disabled:opacity-50"
            >
              {submitBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit ticket"
              )}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Your tickets
          </h2>

          <div className="mt-4 space-y-8">
            <div>
              <h3 className="text-xs font-medium text-slate-500">Active</h3>
              {loadingList ? (
                <p className="mt-3 text-sm text-slate-500">Loading…</p>
              ) : activeTickets.length === 0 ? (
                <p className="mt-3 rounded-lg border border-white/10 bg-[#16181A]/50 px-4 py-6 text-center text-sm text-slate-500">
                  No open tickets. You&apos;re all set.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {activeTickets.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl border border-white/10 bg-[#16181A]/90 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">
                          #{ticketPublicRef(t.id)}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyles(t.status)}`}
                        >
                          {t.status}
                        </span>
                        <span className="text-[10px] font-medium uppercase text-slate-500">
                          {t.priority} priority
                        </span>
                      </div>
                      <p className="mt-2 font-medium text-slate-100">
                        {t.subject}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {t.description}
                      </p>
                      {t.screenshot_url && !demo && (
                        <button
                          type="button"
                          onClick={() => void openSignedUrl(t.screenshot_url!)}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#3395ff] hover:underline"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          View screenshot
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {resolvedTickets.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-slate-500">Resolved</h3>
                <ul className="mt-3 space-y-2">
                  {resolvedTickets.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-lg border border-white/5 bg-[#141516]/80 px-3 py-2.5 text-sm text-slate-500"
                    >
                      <span className="font-mono text-xs text-slate-600">
                        #{ticketPublicRef(t.id)}
                      </span>
                      <span className="mx-2 text-slate-700">·</span>
                      {t.subject}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
