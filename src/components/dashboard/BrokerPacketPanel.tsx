"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";
import {
  BROKER_DOC_CATEGORIES,
  BROKER_DOC_LABELS,
  type BrokerDocCategory,
} from "@/lib/broker-packet/categories";
import { brokerPacketPdfFilename } from "@/lib/broker-packet/broker-packet-filename";
import {
  brokerPacketDownloadBlockedMessage,
  canSendToBroker,
  completenessPercent,
  firstMissingBrokerPacketForDownload,
} from "@/lib/broker-packet/completeness";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { mergeUserOnboardingWithWorkspace } from "@/lib/user-onboarding/sync";

type DocRow = {
  id: string;
  doc_category: BrokerDocCategory;
  storage_path: string;
  original_filename: string | null;
  expiry_date: string | null;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
}

function parseContentDispositionFilename(
  header: string | null
): string | null {
  if (!header) return null;
  const utf8 = header.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return null;
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1].trim();
  const loose = header.match(/filename=([^;\s]+)/i);
  if (loose?.[1]) return loose[1].trim().replace(/^["']|["']$/g, "");
  return null;
}

function coiExpiryTone(
  expiryIso: string | null
): "ok" | "warn" | "bad" | "none" {
  if (!expiryIso) return "none";
  const end = new Date(expiryIso).getTime();
  if (Number.isNaN(end)) return "none";
  const now = Date.now();
  const d30 = 30 * 24 * 60 * 60 * 1000;
  if (end < now) return "bad";
  if (end - now <= d30) return "bad";
  return "ok";
}

type SendModalPhase = "form" | "sending" | "success";

export function BrokerPacketPanel({
  carrierId,
  carrierName,
  mcNumber,
}: {
  carrierId: string;
  carrierName: string;
  /** Shown in the send modal; server still uses DB mc_number for the email subject. */
  mcNumber?: string | null;
}) {
  const {
    supabase,
    orgId,
    interactiveDemo,
    openDemoAccountGate,
    refresh: refreshDashboard,
  } = useDashboardData();

  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyCat, setBusyCat] = useState<BrokerDocCategory | null>(null);
  const [professionalDownloadBusy, setProfessionalDownloadBusy] =
    useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sendPhase, setSendPhase] = useState<SendModalPhase>("form");
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/broker-packet/${carrierId}/documents`, {
        credentials: "include",
      });
      const j = (await res.json()) as { documents?: DocRow[]; error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to load");
      setRows(j.documents ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [carrierId]);

  useEffect(() => {
    void load();
  }, [load]);

  const byCategory = useMemo(() => {
    const m = new Map<BrokerDocCategory, DocRow>();
    for (const r of rows) {
      m.set(r.doc_category, r);
    }
    return m;
  }, [rows]);

  const present = useMemo(() => new Set(byCategory.keys()), [byCategory]);
  const pct = completenessPercent(present);
  const sendOk = canSendToBroker(present);

  const uploadFile = async (cat: BrokerDocCategory, file: File) => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    if (!supabase || !orgId) {
      setErr("Organization not loaded.");
      return;
    }
    setBusyCat(cat);
    setErr(null);
    const hadVault = byCategory.has("w9") || byCategory.has("coi");
    try {
      const safe = sanitizeFilename(file.name);
      const path = `${orgId}/${carrierId}/${cat}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from("broker_packet_docs")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (upErr) throw new Error(upErr.message);

      const res = await fetch(`/api/broker-packet/${carrierId}/documents`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_category: cat,
          storage_path: path,
          original_filename: file.name,
        }),
      });
      const j = (await res.json()) as {
        error?: string;
        document?: { id?: string };
      };
      if (!res.ok) throw new Error(j.error || "Save failed");

      if (cat === "coi" && j.document?.id) {
        await fetch(`/api/broker-packet/${carrierId}/documents/${j.document.id}/scan`, {
          method: "POST",
          credentials: "include",
        });
      }
      await load();
      await refreshDashboard();
      if (
        (cat === "w9" || cat === "coi") &&
        !hadVault &&
        !interactiveDemo &&
        supabase &&
        orgId
      ) {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (uid) {
          await mergeUserOnboardingWithWorkspace(supabase, uid, orgId);
          toast.success("Carrier vault initialized!");
          window.setTimeout(() => {
            toast.message("Compliance Level: Pro");
          }, 450);
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusyCat(null);
    }
  };

  const removeDoc = async (row: DocRow) => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    setBusyCat(row.doc_category);
    setErr(null);
    try {
      const res = await fetch(
        `/api/broker-packet/${carrierId}/documents/${row.id}`,
        { method: "DELETE", credentials: "include" }
      );
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Delete failed");
      await load();
      await refreshDashboard();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyCat(null);
    }
  };

  const scanCoi = async (row: DocRow) => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    setBusyCat(row.doc_category);
    setErr(null);
    try {
      const res = await fetch(
        `/api/broker-packet/${carrierId}/documents/${row.id}/scan`,
        { method: "POST", credentials: "include" }
      );
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Scan failed");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusyCat(null);
    }
  };

  const downloadProfessionalPacket = async () => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    const missing = firstMissingBrokerPacketForDownload(present);
    if (missing) {
      toast.error(brokerPacketDownloadBlockedMessage(missing));
      return;
    }
    setProfessionalDownloadBusy(true);
    try {
      const res = await fetch(`/api/broker-packet/${carrierId}/stitch`, {
        credentials: "include",
      });
      if (!res.ok) {
        let msg = res.statusText;
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          try {
            const j = (await res.json()) as { missing?: BrokerDocCategory };
            if (j.missing) {
              msg = brokerPacketDownloadBlockedMessage(j.missing);
            }
          } catch {
            /* keep msg */
          }
        } else {
          const t = await res.text().catch(() => "");
          if (t) msg = t;
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const fromHeader = parseContentDispositionFilename(
        res.headers.get("Content-Disposition")
      );
      const fallback = brokerPacketPdfFilename(carrierName, mcNumber ?? null);
      const fname = fromHeader || fallback;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2500);
      toast.success("Professional packet downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setProfessionalDownloadBusy(false);
    }
  };

  const sendPacket = async () => {
    const em = sendEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setSendMsg("Enter a valid broker email.");
      return;
    }
    setSendPhase("sending");
    setSendMsg(null);
    try {
      const res = await fetch(`/api/broker-packet/${carrierId}/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: em }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Send failed");
      setSendPhase("success");
    } catch (e) {
      setSendPhase("form");
      setSendMsg(e instanceof Error ? e.message : "Send failed");
    }
  };

  const closeSendModal = useCallback(() => {
    setSendOpen(false);
    setSendEmail("");
    setSendPhase("form");
    setSendMsg(null);
  }, []);

  useEffect(() => {
    if (!sendOpen || sendPhase !== "success") return;
    const t = window.setTimeout(closeSendModal, 3200);
    return () => window.clearTimeout(t);
  }, [sendOpen, sendPhase, closeSendModal]);

  if (!orgId && !interactiveDemo) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-6 text-sm text-amber-100">
        Link a company workspace to manage broker packets.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-400/90">
            <Shield className="h-5 w-5" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wider">
              Broker setup packet
            </p>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-white">{carrierName}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Upload required documents. We stitch them into one PDF for brokers. COI
            dates are scanned for expiration when possible.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-12 min-w-[44px] touch-manipulation items-center justify-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            disabled={professionalDownloadBusy}
            onClick={() => void downloadProfessionalPacket()}
            className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 text-sm font-semibold text-sky-100 hover:bg-sky-950/70 disabled:cursor-wait disabled:opacity-80 sm:min-w-[200px] sm:w-auto"
          >
            {professionalDownloadBusy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <FileText className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {professionalDownloadBusy
              ? "Processing..."
              : "Download Professional Packet"}
          </button>
          <span
            title={
              sendOk
                ? undefined
                : "Missing required documents (operating authority, W-9, and COI)."
            }
            className="inline-flex"
          >
            <button
              type="button"
              disabled={!sendOk}
              onClick={() => {
                setSendMsg(null);
                setSendPhase("form");
                setSendOpen(true);
              }}
              className="inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-lg bg-[#007bff] px-4 text-sm font-semibold text-white shadow-[0_0_16px_rgba(0,123,255,0.25)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <Mail className="h-4 w-4" />
              Send to broker
            </button>
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#16181A]/90 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Completeness
          </p>
          <p className="text-sm font-semibold tabular-nums text-white">{pct}%</p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-sky-500 transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        {!sendOk ? (
          <p className="mt-2 text-xs text-amber-200/90">
            Add operating authority, W-9, and COI to enable download and email.
          </p>
        ) : null}
      </div>

      {err ? (
        <p className="text-sm text-red-400" role="alert">
          {err}
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {BROKER_DOC_CATEGORIES.map((cat) => {
            const row = byCategory.get(cat);
            const tone = cat === "coi" ? coiExpiryTone(row?.expiry_date ?? null) : "none";
            return (
              <div
                key={cat}
                className="flex flex-col rounded-xl border border-white/10 bg-[#121416] p-4 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.5)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {BROKER_DOC_LABELS[cat]}
                    </p>
                    {row ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                        {row.original_filename ?? row.storage_path}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">Not uploaded</p>
                    )}
                  </div>
                  {row ? (
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        cat === "coi" && tone === "bad"
                          ? "border-red-500/50 bg-red-950/50 text-red-200"
                          : cat === "coi" && tone === "ok"
                            ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
                            : "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
                      }`}
                    >
                      {cat === "coi"
                        ? tone === "none"
                          ? "Active"
                          : tone === "bad"
                            ? "Expiry alert"
                            : "Active"
                        : "Uploaded"}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Missing
                    </span>
                  )}
                </div>

                {cat === "coi" && row?.expiry_date ? (
                  <p
                    className={`mt-2 flex items-center gap-1.5 text-xs ${
                      tone === "bad" ? "text-red-300" : "text-slate-400"
                    }`}
                  >
                    {tone === "bad" ? (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400/90" />
                    )}
                    Expires{" "}
                    {new Date(row.expiry_date).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#007bff]/90 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">
                    {busyCat === cat ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {row ? "Replace" : "Upload"}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      disabled={busyCat !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void uploadFile(cat, f);
                      }}
                    />
                  </label>
                  {row ? (
                    <button
                      type="button"
                      onClick={() => void removeDoc(row)}
                      disabled={busyCat !== null}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/35 px-2 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-950/40 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  ) : null}
                  {cat === "coi" && row ? (
                    <button
                      type="button"
                      onClick={() => void scanCoi(row)}
                      disabled={busyCat !== null}
                      className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-40"
                    >
                      Scan expiry
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sendOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-broker-title"
          onClick={() => {
            if (sendPhase === "sending") return;
            closeSendModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#1A1C1E] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sendPhase === "form" ? (
              <>
                <h3 id="send-broker-title" className="text-lg font-semibold text-white">
                  Send to broker
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  We stitch W-9, COI, operating authority, and other uploads into one PDF
                  and email it from NexusFreight.
                </p>
                {mcNumber?.trim() ? (
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    MC# {mcNumber.trim()}
                  </p>
                ) : null}
                <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Broker email
                  <input
                    type="email"
                    value={sendEmail}
                    onChange={(e) => setSendEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-white outline-none focus:border-[#007bff]/50"
                    placeholder="broker@example.com"
                    autoComplete="email"
                  />
                </label>
                {sendMsg ? (
                  <p className="mt-2 text-sm text-red-400" role="alert">
                    {sendMsg}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeSendModal}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 px-4 text-sm font-semibold text-slate-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendPacket()}
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#007bff] px-4 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Send email
                  </button>
                </div>
              </>
            ) : null}

            {sendPhase === "sending" ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Loader2
                  className="h-12 w-12 animate-spin text-[#007bff]"
                  aria-hidden
                />
                <p className="mt-5 text-lg font-semibold text-white">Processing…</p>
                <p className="mt-2 max-w-xs text-sm text-slate-400">
                  Combining your documents into one PDF and sending to the broker.
                </p>
                <p className="sr-only" role="status">
                  Combining PDF and sending email
                </p>
              </div>
            ) : null}

            {sendPhase === "success" ? (
              <div className="flex flex-col items-center py-4 text-center">
                <CheckCircle2
                  className="h-16 w-16 text-emerald-400"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <p className="mt-4 text-xl font-semibold text-white">Success!</p>
                <p className="mt-2 max-w-sm text-sm text-slate-400">
                  The carrier setup packet was sent to the broker&apos;s inbox.
                </p>
                <button
                  type="button"
                  onClick={closeSendModal}
                  className="mt-8 rounded-md bg-[#007bff] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Done
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
