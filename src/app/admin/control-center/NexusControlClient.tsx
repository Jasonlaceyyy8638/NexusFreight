"use client";

import type { AdminCustomerRow } from "@/app/api/admin/customers/route";
import { AdminAuditLog } from "@/app/admin/control-center/AdminAuditLog";
import { AdminCompaniesOverview } from "@/app/admin/control-center/AdminCompaniesOverview";
import { AdminOrgInsights } from "@/app/admin/control-center/AdminOrgInsights";
import { CRISP_WEBSITE_ID } from "@/components/support/CrispChatScript";
import {
  ChevronDown,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

function glanceBadge(g: AdminCustomerRow["glance"]) {
  const base =
    "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";
  switch (g) {
    case "paid":
      return `${base} border-emerald-500/40 bg-emerald-950/50 text-emerald-300`;
    case "beta":
      return `${base} border-violet-500/40 bg-violet-950/50 text-violet-200`;
    case "trial":
      return `${base} border-sky-500/40 bg-sky-950/50 text-sky-200`;
    case "expired":
      return `${base} border-amber-500/40 bg-amber-950/50 text-amber-200`;
    default:
      return `${base} border-slate-600 bg-slate-900 text-slate-400`;
  }
}

function glanceLabel(g: AdminCustomerRow["glance"]) {
  switch (g) {
    case "paid":
      return "Active paid";
    case "beta":
      return "Beta";
    case "trial":
      return "Trial";
    case "expired":
      return "Trial ended";
    default:
      return "—";
  }
}

const crispInboxUrl = `https://app.crisp.chat/website/${CRISP_WEBSITE_ID}/inbox/`;

type MainTab = "organizations" | "companies" | "audit" | "billing";

export function NexusControlClient() {
  const [mainTab, setMainTab] = useState<MainTab>("companies");
  const [rows, setRows] = useState<AdminCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [modal, setModal] = useState<
    | null
    | { type: "cancel" | "refund" | "credit" | "trial"; row: AdminCustomerRow }
  >(null);
  const [reason, setReason] = useState("");
  const [creditAmount, setCreditAmount] = useState("25");
  const [trialLocal, setTrialLocal] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/customers", { credentials: "include" });
      if (res.status === 404) {
        setErr("Unauthorized.");
        setRows([]);
        return;
      }
      const data = (await res.json()) as {
        customers?: AdminCustomerRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data.customers ?? []);
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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = [
        r.email,
        r.full_name ?? "",
        r.company_name,
        r.mc_number ?? "",
        r.stripe_customer_id ?? "",
        r.stripe_subscription_id ?? "",
        r.subscription_status ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function runAction(
    kind: "cancel" | "refund" | "credit" | "trial",
    row: AdminCustomerRow
  ) {
    setActionBusy(true);
    setActionMsg(null);
    try {
      let path = "";
      let body: Record<string, unknown> = { userId: row.id, reason };

      if (kind === "cancel") path = "/api/admin/subscription/cancel";
      else if (kind === "refund") path = "/api/admin/refund";
      else if (kind === "credit") {
        path = "/api/admin/credit";
        const n = Number.parseFloat(creditAmount);
        if (Number.isNaN(n) || n <= 0) throw new Error("Invalid credit amount");
        body = { ...body, amountUsd: n };
      } else if (kind === "trial") {
        path = "/api/admin/trial";
        const iso = new Date(trialLocal).toISOString();
        if (Number.isNaN(new Date(trialLocal).getTime())) {
          throw new Error("Invalid trial end date");
        }
        body = { userId: row.id, reason, trialEndsAt: iso };
      }

      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) throw new Error(j.error || "Action failed");
      setActionMsg("Done.");
      setModal(null);
      setReason("");
      await load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="border-b border-slate-800 pb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
            Internal
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Nexus Control
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Organization oversight, vetting signals, and billing actions (logged).
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMainTab("companies")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              mainTab === "companies"
                ? "bg-slate-100 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Companies
          </button>
          <button
            type="button"
            onClick={() => setMainTab("organizations")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              mainTab === "organizations"
                ? "bg-slate-100 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Org metrics
          </button>
          <button
            type="button"
            onClick={() => setMainTab("audit")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              mainTab === "audit"
                ? "bg-slate-100 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Audit log
          </button>
          <button
            type="button"
            onClick={() => setMainTab("billing")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              mainTab === "billing"
                ? "bg-slate-100 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Customer billing
          </button>
        </div>

        {mainTab === "organizations" ? (
          <div className="mt-10">
            <AdminOrgInsights />
          </div>
        ) : null}

        {mainTab === "companies" ? (
          <div className="mt-10">
            <p className="max-w-2xl text-sm text-slate-500">
              Each row is a managed carrier (company). Staff counts come from
              memberships; roster drivers are rows in{" "}
              <code className="text-slate-400">drivers</code>.
            </p>
            <AdminCompaniesOverview />
          </div>
        ) : null}

        {mainTab === "audit" ? (
          <div className="mt-10">
            <p className="max-w-2xl text-sm text-slate-500">
              Loads created, MC searches (signed-in), and driver invites (after
              migration).
            </p>
            <AdminAuditLog />
          </div>
        ) : null}

        {mainTab === "billing" ? (
          <>
        <div className="relative mt-8 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"
            aria-hidden
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name, email, company, MC, Stripe…"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-slate-600"
          />
        </div>

        {err && (
          <p className="mt-6 text-sm text-red-400">{err}</p>
        )}

        {loading ? (
          <div className="mt-12 flex justify-center text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Glance</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">MC</th>
                  <th className="px-4 py-3">Stripe customer</th>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">Live</th>
                  <th className="px-4 py-3 w-48">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-800/80 last:border-0 hover:bg-slate-900/80"
                  >
                    <td className="px-4 py-3">
                      <span className={glanceBadge(row.glance)}>
                        {glanceLabel(row.glance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {row.full_name?.trim() || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {row.company_name}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {row.email || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {row.mc_number || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {row.stripe_customer_id || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {row.subscription_status || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={crispInboxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
                        title="Open Crisp inbox; search by visitor email"
                      >
                        Live View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setMenuOpen((m) => (m === row.id ? null : row.id))
                          }
                          className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                        >
                          Manage
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        {menuOpen === row.id && (
                          <>
                            <button
                              type="button"
                              className="fixed inset-0 z-10 cursor-default"
                              aria-label="Close menu"
                              onClick={() => setMenuOpen(null)}
                            />
                            <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                                onClick={() => {
                                  setMenuOpen(null);
                                  setModal({ type: "cancel", row });
                                  setReason("");
                                }}
                              >
                                Cancel subscription
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                                onClick={() => {
                                  setMenuOpen(null);
                                  setModal({ type: "refund", row });
                                  setReason("");
                                }}
                              >
                                Issue refund
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                                onClick={() => {
                                  setMenuOpen(null);
                                  setModal({ type: "credit", row });
                                  setReason("");
                                }}
                              >
                                Add credit
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                                onClick={() => {
                                  setMenuOpen(null);
                                  setModal({ type: "trial", row });
                                  setReason("");
                                  const d = row.trial_ends_at
                                    ? new Date(row.trial_ends_at)
                                    : new Date();
                                  setTrialLocal(
                                    d.toISOString().slice(0, 16)
                                  );
                                }}
                              >
                                Trial override
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </>
        ) : null}

        {mainTab === "billing" && modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <h2 className="text-lg font-semibold text-white">
                {modal.type === "cancel" && "Cancel subscription"}
                {modal.type === "refund" && "Issue refund"}
                {modal.type === "credit" && "Add account credit"}
                {modal.type === "trial" && "Trial end override"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {modal.row.email} — {modal.row.company_name}
              </p>
              {modal.type === "credit" && (
                <label className="mt-4 block text-xs font-medium text-slate-400">
                  Amount (USD)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </label>
              )}
              {modal.type === "trial" && (
                <label className="mt-4 block text-xs font-medium text-slate-400">
                  New trial ends (local time)
                  <input
                    type="datetime-local"
                    value={trialLocal}
                    onChange={(e) => setTrialLocal(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </label>
              )}
              <label className="mt-4 block text-xs font-medium text-slate-400">
                Reason (logged)
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  placeholder="Internal note"
                />
              </label>
              {actionMsg && (
                <p className="mt-3 text-sm text-slate-400">{actionMsg}</p>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModal(null);
                    setActionMsg(null);
                  }}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void runAction(modal.type, modal.row)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white disabled:opacity-50"
                >
                  {actionBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
