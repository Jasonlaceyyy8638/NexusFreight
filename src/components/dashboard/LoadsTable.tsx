"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { LoadStatusBadge } from "@/components/dashboard/LoadStatusBadge";
import { blobToBase64 } from "@/lib/browser/blob-to-base64";
import {
  CARRIER_AUTHORITY_INACTIVE_TOOLTIP,
  CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING,
  carrierAuthorityAssignable,
} from "@/lib/carrier-authority";
import { LOAD_STATUS_LABELS } from "@/lib/load-status-labels";
import type { QuickFireTemplateType } from "@/lib/sms/quick-fire-templates";
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
  "notification_sent",
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
  const { interactiveDemo, openDemoAccountGate, updateLoadStatus, refresh } =
    useDashboardData();
  const [alertBusyLoadId, setAlertBusyLoadId] = useState<string | null>(null);
  const [alertSelectValue, setAlertSelectValue] = useState<
    Record<string, string>
  >({});
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

  const sendQuickFireSms = async (
    load: Load,
    templateType: QuickFireTemplateType,
    newTime?: string
  ) => {
    if (interactiveDemo) {
      setDocMessage(
        templateType === "dispatch"
          ? 'Demo preview: a "new load" text would go to this driver\'s phone. No SMS is sent here—create an account to message drivers for real.'
          : templateType === "cancelled"
            ? "Demo preview: a cancellation text would go to the driver and the load would be marked cancelled. No SMS is sent in preview."
            : "Demo preview: a delay update would go to the driver with your new pickup window. No SMS is sent in preview."
      );
      openDemoAccountGate();
      return;
    }
    setAlertBusyLoadId(load.id);
    setDocMessage(null);
    try {
      const res = await fetch("/api/dispatch/quick-fire-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loadId: load.id,
          templateType,
          ...(templateType === "delayed" ? { newTime: newTime ?? "" } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDocMessage(
          typeof body.error === "string" ? body.error : "Quick Alert failed."
        );
        return;
      }
      if (templateType === "cancelled") {
        await updateLoadStatus(load.id, "cancelled");
      }
      await refresh();
      setDocMessage(
        templateType === "dispatch"
          ? "Dispatch (New Load) SMS sent."
          : templateType === "cancelled"
            ? "Cancelled alert sent. Load marked cancelled."
            : "Delay alert sent."
      );
    } catch (e) {
      setDocMessage(e instanceof Error ? e.message : "Quick Alert failed.");
    } finally {
      setAlertBusyLoadId(null);
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
            const carrierInactive =
              carrier != null && !carrierAuthorityAssignable(carrier);
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
                    <td
                      className={`px-4 py-3 ${
                        carrierInactive ? "text-slate-600" : "text-slate-400"
                      }`}
                      title={
                        carrierInactive
                          ? CARRIER_AUTHORITY_INACTIVE_TOOLTIP
                          : undefined
                      }
                    >
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
                            {LOAD_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <LoadStatusBadge status={load.status} />
                    )}
                    {load.driver_notified_at ? (
                      <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
                        Driver notified{" "}
                        {new Date(load.driver_notified_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    ) : null}
                    {load.activity_log && load.activity_log.length > 0 ? (
                      <ul className="mt-1.5 max-h-20 space-y-0.5 overflow-y-auto text-[10px] leading-snug text-slate-500">
                        {load.activity_log.slice(-5).map((entry, i) => (
                          <li key={`${entry.at}-${i}`}>{entry.message}</li>
                        ))}
                      </ul>
                    ) : null}
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
                    <div className="flex flex-col items-end gap-2">
                      <Link
                        href={`/dashboard/loads/${load.id}`}
                        className="text-xs font-semibold text-[#3395ff] hover:underline"
                      >
                        Load details
                      </Link>
                      {load.status === "draft" && allowDispatch ? (
                        carrierInactive ? (
                          <div className="flex max-w-[14rem] flex-col items-end gap-1.5 text-right">
                            <button
                              type="button"
                              disabled
                              title={CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING}
                              className="cursor-not-allowed rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-500 opacity-60"
                            >
                              Dispatch
                            </button>
                            <p className="text-[11px] font-medium leading-snug text-red-400">
                              {CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING}
                            </p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void onDispatch(load)}
                            className="rounded-md bg-[#007bff] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(0,123,255,0.35)] transition-opacity hover:opacity-90"
                          >
                            Dispatch
                          </button>
                        )
                      ) : load.status === "draft" && !allowDispatch ? (
                        <span
                          className="text-xs text-slate-600"
                          title="Requires dispatch permission"
                        >
                          No access
                        </span>
                      ) : null}
                      {load.driver_id && allowDispatch ? (
                        <>
                          <label
                            className="sr-only"
                            htmlFor={`quick-alert-${load.id}`}
                          >
                            Quick Alert email-to-SMS for this load
                          </label>
                          <select
                            id={`quick-alert-${load.id}`}
                            className="max-w-[12rem] cursor-pointer rounded-md border border-amber-500/35 bg-[#1a1510] px-2 py-1.5 text-left text-xs text-amber-100 outline-none focus:border-amber-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={
                              carrierInactive || alertBusyLoadId === load.id
                            }
                            title={
                              carrierInactive
                                ? CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING
                                : interactiveDemo
                                  ? "Open the list and pick an action—preview won’t send a real text"
                                  : "Preset texts to the assigned driver’s phone"
                            }
                            value={alertSelectValue[load.id] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value as
                                | QuickFireTemplateType
                                | "";
                              setAlertSelectValue((prev) => ({
                                ...prev,
                                [load.id]: "",
                              }));
                              if (v === "") return;
                              if (v === "delayed") {
                                const nt = window.prompt(
                                  "New pickup window?",
                                  ""
                                );
                                if (nt === null) return;
                                void sendQuickFireSms(load, "delayed", nt);
                                return;
                              }
                              if (v === "dispatch" || v === "cancelled") {
                                void sendQuickFireSms(load, v);
                              }
                            }}
                            aria-label="Quick Alert"
                          >
                            <option value="">
                              {alertBusyLoadId === load.id
                                ? "Sending…"
                                : "Quick Alert"}
                            </option>
                            <option value="dispatch">
                              Dispatch (New Load)
                            </option>
                            <option value="cancelled">Cancelled</option>
                            <option value="delayed">Delayed</option>
                          </select>
                          {carrierInactive ? (
                            <p className="max-w-[12rem] text-right text-[10px] font-medium leading-snug text-red-400/90">
                              {CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING}
                            </p>
                          ) : null}
                        </>
                      ) : null}
                      {allowDispatch &&
                      !load.driver_id &&
                      load.status !== "draft" ? (
                        <span
                          className="text-xs text-slate-600"
                          title="Assign a driver to use Quick Alert"
                        >
                          —
                        </span>
                      ) : null}
                      {!allowDispatch && load.status !== "draft" ? (
                        <span className="text-xs text-slate-600">—</span>
                      ) : null}
                    </div>
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
