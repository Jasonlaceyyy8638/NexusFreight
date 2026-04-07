"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { EditCarrierModal } from "@/components/dashboard/EditCarrierModal";
import { LoadQuickAlertButtons } from "@/components/dashboard/LoadQuickAlertButtons";
import { LoadStatusBadge } from "@/components/dashboard/LoadStatusBadge";
import { LiveMapLazy } from "@/components/dashboard/LiveMapLazy";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { AuthorityActiveSinceBlock } from "@/components/fmcsa/AuthorityActiveSinceBlock";
import { FmcsaVerifiedBadge } from "@/components/fmcsa/FmcsaVerifiedBadge";
import { carrierAuthorityAssignable } from "@/lib/carrier-authority";
import { normalizeDriverRosterStatus } from "@/lib/driver-roster-status";
import type {
  Carrier,
  Driver,
  EldConnection,
  Load,
  Truck,
} from "@/types/database";

const inviteInputClass =
  "mt-1.5 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function CarrierProfileClient(props: {
  carrier: Carrier;
  drivers: Driver[];
  loads: Load[];
  trucks: Truck[];
  eldConnections: EldConnection[];
}) {
  const { carrier, drivers, loads, trucks, eldConnections } = props;
  const {
    supabase,
    orgId,
    usingDemo,
    interactiveDemo,
    openDemoAccountGate,
    refresh,
    permissions,
    isCarrierOrg,
  } = useDashboardData();
  const [editOpen, setEditOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const canFin = permissions.can_view_financials;
  const canInviteDriver =
    !isCarrierOrg &&
    (permissions.admin_access ||
      permissions.can_edit_fleet ||
      permissions.can_dispatch_loads);

  const submitInvite = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setInviteMsg(null);
      setInviteErr(null);
      if (interactiveDemo) {
        openDemoAccountGate();
        return;
      }
      const em = inviteEmail.trim().toLowerCase();
      if (!em || !em.includes("@")) {
        setInviteErr("Enter a valid email.");
        return;
      }
      setInviteBusy(true);
      try {
        const res = await fetch("/api/fleet/invite-driver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: em,
            full_name: inviteName.trim(),
            carrier_id: carrier.id,
          }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) {
          setInviteErr(typeof j.error === "string" ? j.error : "Invite failed.");
          return;
        }
        setInviteEmail("");
        setInviteName("");
        setInviteMsg(
          "Invite sent. The driver will appear on this carrier after they accept."
        );
        await refresh();
      } catch {
        setInviteErr("Invite request failed.");
      } finally {
        setInviteBusy(false);
      }
    },
    [
      interactiveDemo,
      openDemoAccountGate,
      inviteEmail,
      inviteName,
      carrier.id,
      refresh,
    ]
  );
  const activeDrivers = drivers.filter(
    (d) => normalizeDriverRosterStatus(d.status) === "active"
  ).length;

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Carrier profile
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {carrier.name}
          </h1>
          {carrierAuthorityAssignable(carrier) ? <FmcsaVerifiedBadge /> : null}
          {supabase && orgId ? (
            <button
              type="button"
              onClick={() => {
                if (interactiveDemo) {
                  openDemoAccountGate();
                  return;
                }
                setEditOpen(true);
              }}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-[#007bff]/40 hover:bg-white/10"
            >
              Edit carrier
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-slate-400">
          {[
            carrier.mc_number ? `MC ${carrier.mc_number}` : null,
            carrier.dot_number ? `DOT ${carrier.dot_number}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
        <div className="mt-4 max-w-md rounded-lg border border-white/10 bg-[#121416]/60 p-4">
          <AuthorityActiveSinceBlock
            authority_date={carrier.authority_date}
            is_new_authority={carrier.is_new_authority}
          />
        </div>
        {carrier.compliance_log || carrier.compliance_alert ? (
          <div
            className="mt-4 max-w-xl rounded-lg border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-100"
            role="status"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">
              Compliance alert
            </p>
            <p className="mt-1 text-sm text-amber-50/95">
              {carrier.compliance_log ?? carrier.compliance_alert}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Service fee
          </p>
          {canFin ? (
            <p className="mt-2 text-2xl font-bold tabular-nums text-white">
              {carrier.service_fee_type === "flat"
                ? money(carrier.service_fee_flat_cents ?? 0)
                : `${carrier.fee_percent}%`}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Hidden — financials off</p>
          )}
          {canFin && carrier.service_fee_type === "flat" ? (
            <p className="mt-1 text-xs text-slate-500">Flat per delivered load</p>
          ) : canFin ? (
            <p className="mt-1 text-xs text-slate-500">Percent of linehaul</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active drivers
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-white">
            {activeDrivers}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {drivers.length} total rostered
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            ELD
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {eldConnections.length > 0
              ? `Connected (${eldConnections.map((e) => e.provider).join(", ")})`
              : "Not connected"}
          </p>
        </div>
      </div>

      {canInviteDriver ? (
        <section className="rounded-xl border border-white/10 bg-[#121416] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Invite driver (this carrier)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Sends an email invite scoped to {carrier.name}. They only see loads
            you assign to them.
          </p>
          <form
            onSubmit={(e) => void submitInvite(e)}
            className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <label className="min-w-[200px] flex-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email
              <input
                type="email"
                autoComplete="email"
                className={inviteInputClass}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="driver@example.com"
                required
              />
            </label>
            <label className="min-w-[160px] flex-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Name (optional)
              <input
                className={inviteInputClass}
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Shown in the app"
              />
            </label>
            <button
              type="submit"
              disabled={inviteBusy}
              className="rounded-md bg-[#007bff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(0,123,255,0.3)] hover:opacity-90 disabled:opacity-40"
            >
              {inviteBusy ? "Sending…" : "Send invite"}
            </button>
          </form>
          {inviteErr ? (
            <p className="mt-3 text-sm font-medium text-red-400">{inviteErr}</p>
          ) : null}
          {inviteMsg ? (
            <p className="mt-3 text-sm font-medium text-emerald-400/90">
              {inviteMsg}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Live map (this carrier only)
        </h2>
        <LiveMapLazy
          selectedCarrierId={carrier.id}
          trucks={trucks}
          eldConnections={eldConnections}
          carriers={[carrier]}
          height={360}
          isCarrierViewer={isCarrierOrg}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Load history
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#121416] shadow-[0_16px_48px_-16px_rgba(0,0,0,0.5)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-[#16181A] text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Lane</th>
                <th className="px-4 py-3 font-semibold">Rate</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Load details</th>
              </tr>
            </thead>
            <tbody>
              {loads.map((load, rowIdx) => (
                <tr
                  key={load.id}
                  className={`border-b border-white/[0.06] last:border-0 ${
                    rowIdx % 2 === 0 ? "bg-[#1A1C1E]" : "bg-[#16181A]/90"
                  }`}
                >
                  <td className="px-4 py-3 text-slate-200">
                    {load.origin} → {load.destination}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-300">
                    {money(load.rate_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <LoadStatusBadge status={load.status} />
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <div className="flex flex-col items-end gap-2">
                      <Link
                        href={`/dashboard/loads/${load.id}`}
                        className="text-xs font-semibold text-[#3395ff] hover:underline"
                      >
                        Open
                      </Link>
                      <LoadQuickAlertButtons
                        load={load}
                        allowDispatch={permissions.can_dispatch_loads}
                        onSuccess={() => void refresh()}
                        className="justify-end"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {supabase && orgId ? (
        <EditCarrierModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          carrier={carrier}
          supabase={supabase}
          usingDemo={usingDemo}
          interactiveDemo={interactiveDemo}
          openDemoAccountGate={openDemoAccountGate}
          onSaved={() => void refresh()}
          canViewFinancials={canFin}
        />
      ) : null}
    </main>
  );
}
