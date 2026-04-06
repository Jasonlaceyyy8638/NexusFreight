"use client";

import { Fragment, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { LoadStatusBadge } from "@/components/dashboard/LoadStatusBadge";
import { blobToBase64 } from "@/lib/browser/blob-to-base64";
import type { Carrier, Driver, Load, LoadStatus } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Props = {
  loads: Load[];
  carriers: Carrier[];
  drivers: Driver[];
  money: (cents: number) => string;
  onDispatch: (load: Load) => void | Promise<void>;
  supabase: SupabaseClient | null;
  showDocuments?: boolean;
  /** Dispatch agencies see a carrier column; fleets do not. */
  showCarrierColumn?: boolean;
  /** When false, draft-row dispatch is hidden (permission). */
  allowDispatch?: boolean;
};

const ALL_LOAD_STATUSES: LoadStatus[] = [
  "draft",
  "dispatched",
  "in_transit",
  "delivered",
  "cancelled",
];

export function LoadsTable({
  loads,
  carriers,
  drivers,
  money,
  onDispatch,
  supabase,
  showDocuments = true,
  showCarrierColumn = true,
  allowDispatch = true,
}: Props) {
  const { interactiveDemo, openDemoAccountGate, updateLoadStatus } =
    useDashboardData();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const [driverEmailDraft, setDriverEmailDraft] = useState<Record<string, string>>(
    {}
  );
  const [docMessage, setDocMessage] = useState<string | null>(null);

  const colCount =
    1 +
    (showCarrierColumn ? 1 : 0) +
    1 +
    1 +
    (showDocuments ? 1 : 0) +
    1;

  const carrierOf = (id: string) => carriers.find((c) => c.id === id);
  const driverOf = (id: string | null) =>
    id ? drivers.find((d) => d.id === id) : undefined;

  const getRateconBlob = async (path: string): Promise<Blob> => {
    if (!supabase) throw new Error("Not signed in");
    const { data, error } = await supabase.storage.from("ratecons").download(path);
    if (error || !data) throw error ?? new Error("Download failed");
    return data;
  };

  const viewRatecon = async (path: string) => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    if (!supabase) return;
    setBusyDoc(path);
    setDocMessage(null);
    try {
      const { data, error } = await supabase.storage
        .from("ratecons")
        .createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) throw error ?? new Error("URL failed");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setDocMessage(e instanceof Error ? e.message : "Could not open document");
    } finally {
      setBusyDoc(null);
    }
  };

  const downloadRatecon = async (path: string, filename: string) => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    if (!supabase) return;
    setBusyDoc(path);
    setDocMessage(null);
    try {
      const blob = await getRateconBlob(path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "rate-confirmation.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDocMessage(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusyDoc(null);
    }
  };

  const emailRatecon = async (
    path: string,
    to: string,
    subject: string,
    filename: string
  ) => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    setBusyDoc(path);
    setDocMessage(null);
    try {
      const blob = await getRateconBlob(path);
      const fileBase64 = await blobToBase64(blob);
      const res = await fetch("/api/documents/email-ratecon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          subject,
          bodyText: "Rate confirmation attached.",
          fileBase64,
          filename,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Email failed");
      setDocMessage("Email sent.");
    } catch (e) {
      setDocMessage(e instanceof Error ? e.message : "Email failed");
    } finally {
      setBusyDoc(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#121416] shadow-[0_16px_48px_-16px_rgba(0,0,0,0.5)]">
      {docMessage ? (
        <div className="border-b border-white/10 bg-[#16181A] px-4 py-2 text-center text-xs text-slate-400">
          {docMessage}
        </div>
      ) : null}
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-[#16181A] text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Lane</th>
            {showCarrierColumn ? (
              <th className="px-4 py-3 font-semibold">Carrier</th>
            ) : null}
            <th className="px-4 py-3 font-semibold">Rate</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            {showDocuments ? (
              <th className="px-4 py-3 font-semibold">Documents</th>
            ) : null}
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loads.map((load, rowIdx) => {
            const carrier = carrierOf(load.carrier_id);
            const driver = driverOf(load.driver_id);
            const stripe =
              rowIdx % 2 === 0 ? "bg-[#1A1C1E]" : "bg-[#16181A]/90";
            const path = load.ratecon_storage_path;
            const fileLeaf =
              path?.split("/").pop() ?? "rate-confirmation.pdf";
            const expanded = expandedId === load.id;

            return (
              <Fragment key={load.id}>
                <tr
                  className={`border-b border-white/[0.06] last:border-0 ${stripe}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-100">
                      {load.origin}
                    </span>
                    <span className="text-slate-500"> → </span>
                    <span className="font-medium text-slate-100">
                      {load.destination}
                    </span>
                  </td>
                  {showCarrierColumn ? (
                    <td className="px-4 py-3 text-slate-400">
                      {carrier?.name ?? "—"}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 tabular-nums text-slate-200">
                    {money(load.rate_cents)}
                  </td>
                  <td className="px-4 py-3">
                    {allowDispatch ? (
                      <select
                        className="max-w-[10rem] rounded-md border border-white/10 bg-[#121416] px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-[#007bff]/50"
                        value={load.status}
                        onChange={(e) =>
                          void updateLoadStatus(
                            load.id,
                            e.target.value as LoadStatus
                          )
                        }
                        aria-label="Load status"
                      >
                        {ALL_LOAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <LoadStatusBadge status={load.status} />
                    )}
                  </td>
                  {showDocuments ? (
                    <td className="px-4 py-3">
                      {path ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expanded ? null : load.id)
                          }
                          className="text-xs font-semibold text-[#3395ff] hover:underline"
                        >
                          {expanded ? "Hide" : "Rate con"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-right">
                    {load.status === "draft" ? (
                      allowDispatch ? (
                        <button
                          type="button"
                          onClick={() => void onDispatch(load)}
                          className="rounded-md bg-[#007bff] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(0,123,255,0.35)] transition-opacity hover:opacity-90"
                        >
                          Dispatch
                        </button>
                      ) : (
                        <span
                          className="text-xs text-slate-600"
                          title="Requires dispatch permission"
                        >
                          No access
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                </tr>
                {showDocuments && expanded && path ? (
                  <tr className={`border-b border-white/[0.06] ${stripe}`}>
                    <td colSpan={colCount} className="px-4 pb-4 pt-0">
                      <div className="rounded-lg border border-white/10 bg-[#121416]/90 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Rate confirmation (PDF)
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyDoc === path}
                            onClick={() => void viewRatecon(path)}
                            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            disabled={busyDoc === path}
                            onClick={() =>
                              void downloadRatecon(path, fileLeaf)
                            }
                            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
                          >
                            Download
                          </button>
                        </div>
                        <div
                          className={`mt-4 grid gap-3 border-t border-white/10 pt-4 ${showCarrierColumn ? "sm:grid-cols-2" : ""}`}
                        >
                          {showCarrierColumn ? (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Email to carrier
                              </p>
                              {carrier?.contact_email ? (
                                <button
                                  type="button"
                                  disabled={busyDoc === path}
                                  onClick={() =>
                                    void emailRatecon(
                                      path,
                                      carrier.contact_email!,
                                      `Rate confirmation — ${load.origin} to ${load.destination}`,
                                      fileLeaf
                                    )
                                  }
                                  className="mt-2 rounded-md bg-[#007bff]/90 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                >
                                  Send to {carrier.contact_email}
                                </button>
                              ) : (
                                <p className="mt-2 text-xs text-slate-500">
                                  Add a settlement email on the carrier profile.
                                </p>
                              )}
                            </div>
                          ) : null}
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Email to driver
                            </p>
                            {driver ? (
                              <>
                                <input
                                  type="email"
                                  className="mt-2 w-full rounded-md border border-white/10 bg-[#16181A] px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-[#007bff]/50"
                                  placeholder={
                                    driver.contact_email ?? "Driver email"
                                  }
                                  value={
                                    driverEmailDraft[load.id] ??
                                    driver.contact_email ??
                                    ""
                                  }
                                  onChange={(e) =>
                                    setDriverEmailDraft((d) => ({
                                      ...d,
                                      [load.id]: e.target.value,
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  disabled={busyDoc === path}
                                  onClick={() => {
                                    const to =
                                      driverEmailDraft[load.id] ??
                                      driver.contact_email ??
                                      "";
                                    if (!to.trim()) {
                                      setDocMessage("Enter a driver email.");
                                      return;
                                    }
                                    void emailRatecon(
                                      path,
                                      to,
                                      `Rate confirmation — ${load.origin} to ${load.destination}`,
                                      fileLeaf
                                    );
                                  }}
                                  className="mt-2 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50"
                                >
                                  Send to driver
                                </button>
                              </>
                            ) : (
                              <p className="mt-2 text-xs text-slate-500">
                                Assign a driver to enable email.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
