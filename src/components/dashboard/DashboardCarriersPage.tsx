"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AddCarrierModal } from "@/components/dashboard/AddCarrierModal";
import { EditCarrierModal } from "@/components/dashboard/EditCarrierModal";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { FmcsaVerifiedBadge } from "@/components/fmcsa/FmcsaVerifiedBadge";
import { NewAuthorityBadge } from "@/components/fmcsa/NewAuthorityBadge";
import { carrierAuthorityAssignable } from "@/lib/carrier-authority";
import { carrierIsNewAuthority } from "@/lib/fmcsa_authority";

export function DashboardCarriersPage() {
  const {
    supabase,
    orgId,
    isCarrierOrg,
    usingDemo,
    interactiveDemo,
    openDemoAccountGate,
    carriers,
    drivers,
    refresh,
    permissions,
  } = useDashboardData();
  const router = useRouter();
  const [addCarrierOpen, setAddCarrierOpen] = useState(false);
  const [editCarrier, setEditCarrier] = useState<(typeof carriers)[0] | null>(
    null
  );
  const canFin = permissions.can_view_financials;
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [eldRequestingId, setEldRequestingId] = useState<string | null>(null);

  useEffect(() => {
    if (isCarrierOrg) {
      router.replace("/dashboard/team");
    }
  }, [isCarrierOrg, router]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const c of carriers) {
      next[c.id] = c.contact_email ?? "";
    }
    setEmailDrafts(next);
  }, [carriers]);

  const saveEmail = useCallback(
    async (carrierId: string) => {
      if (interactiveDemo) {
        openDemoAccountGate();
        return;
      }
      if (!supabase || usingDemo) {
        alert("Connect Supabase to save carrier email.");
        return;
      }
      const v = emailDrafts[carrierId]?.trim() ?? "";
      setSavingId(carrierId);
      try {
        const { error } = await supabase
          .from("carriers")
          .update({ contact_email: v || null })
          .eq("id", carrierId);
        if (error) throw error;
        await refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not save email");
      } finally {
        setSavingId(null);
      }
    },
    [supabase, usingDemo, interactiveDemo, openDemoAccountGate, emailDrafts, refresh]
  );

  const requestEldSync = useCallback(
    async (carrierId: string) => {
      if (interactiveDemo) {
        openDemoAccountGate();
        return;
      }
      const email = emailDrafts[carrierId]?.trim() ?? "";
      if (!email) {
        alert("Add and save a carrier contact email before requesting ELD sync.");
        return;
      }
      setEldRequestingId(carrierId);
      try {
        const res = await fetch("/api/eld-invite/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carrierId }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(
            typeof (body as { error?: unknown }).error === "string"
              ? (body as { error: string }).error
              : "Could not send ELD request."
          );
          return;
        }
        alert(
          "Magic link sent. The carrier has 48 hours to complete ELD authorization."
        );
      } finally {
        setEldRequestingId(null);
      }
    },
    [interactiveDemo, openDemoAccountGate, emailDrafts]
  );

  if (isCarrierOrg) {
    return (
      <div className="px-6 py-16 text-center text-sm text-slate-500">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Carriers
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            MC profiles
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage client carriers, settlement email for PDFs, and FMCSA
            verification.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (interactiveDemo) {
              openDemoAccountGate();
              return;
            }
            if (!supabase || usingDemo) {
              alert(
                "Connect Supabase and sign in with your dispatcher account to add carriers verified by FMCSA."
              );
              return;
            }
            setAddCarrierOpen(true);
          }}
          className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-[#007bff]/40 hover:bg-white/10"
        >
          Add carrier
        </button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {carriers.map((c) => (
          <li
            key={c.id}
            className={`rounded-xl border p-4 backdrop-blur-sm ${
              c.is_active_authority === false
                ? "border-red-500/45 bg-red-950/25 ring-1 ring-red-500/20"
                : "border-white/10 bg-[#16181A]/90"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Link
                href={`/dashboard/carriers/${c.id}`}
                className="font-semibold text-white transition-colors hover:text-[#3395ff]"
              >
                {c.name}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                {!carrierAuthorityAssignable(c) ? (
                  <span className="rounded-md border border-red-500/40 bg-red-950/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-200">
                    Authority inactive
                  </span>
                ) : null}
                {carrierAuthorityAssignable(c) ? <FmcsaVerifiedBadge /> : null}
                {carrierIsNewAuthority(c) ? <NewAuthorityBadge /> : null}
                {supabase && orgId ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (interactiveDemo) {
                        openDemoAccountGate();
                        return;
                      }
                      setEditCarrier(c);
                    }}
                    className="rounded-md border border-white/15 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:border-[#007bff]/40"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {canFin
                ? c.service_fee_type === "flat"
                  ? `Flat ${((c.service_fee_flat_cents ?? 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} / delivered load · `
                  : `Fee ${c.fee_percent}% · `
                : "Fee on file · "}
              {c.mc_number ? <>MC {c.mc_number} · </> : null}
              {c.dot_number ? <>DOT {c.dot_number} · </> : null}
              {drivers.filter((d) => d.carrier_id === c.id).length} drivers
            </p>
            {c.compliance_log || c.compliance_alert ? (
              <p className="mt-2 text-[11px] text-amber-200/90">
                {c.compliance_log ?? c.compliance_alert}
              </p>
            ) : null}
            <div className="mt-3 border-t border-white/10 pt-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Settlement & documents email
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="email"
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#121416] px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-[#007bff]/50"
                  placeholder="billing@carrier.com"
                  value={emailDrafts[c.id] ?? ""}
                  onChange={(e) =>
                    setEmailDrafts((d) => ({ ...d, [c.id]: e.target.value }))
                  }
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  disabled={savingId === c.id}
                  onClick={() => void saveEmail(c.id)}
                  className="shrink-0 rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50"
                >
                  {savingId === c.id ? "…" : "Save"}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-600">
                Used for settlement PDFs, rate con delivery, and ELD magic links.
              </p>
            </div>
            <div className="mt-3 border-t border-white/10 pt-3">
              <button
                type="button"
                disabled={eldRequestingId === c.id}
                onClick={() => void requestEldSync(c.id)}
                className="w-full rounded-md border border-emerald-500/35 bg-emerald-950/40 py-2 text-xs font-semibold text-emerald-100/95 hover:bg-emerald-900/35 disabled:opacity-50"
              >
                {eldRequestingId === c.id
                  ? "Sending…"
                  : "Request ELD sync"}
              </button>
              <p className="mt-1 text-[10px] text-slate-600">
                Emails a 48-hour secure link so the carrier can connect Samsara,
                Motive, or Geotab.
              </p>
            </div>
          </li>
        ))}
      </ul>

      {orgId && supabase ? (
        <AddCarrierModal
          open={addCarrierOpen}
          onClose={() => setAddCarrierOpen(false)}
          orgId={orgId}
          supabase={supabase}
          usingDemo={usingDemo}
          onCreated={() => void refresh()}
        />
      ) : null}

      {orgId && supabase && editCarrier ? (
        <EditCarrierModal
          open
          onClose={() => setEditCarrier(null)}
          carrier={editCarrier}
          supabase={supabase}
          usingDemo={usingDemo}
          interactiveDemo={interactiveDemo}
          openDemoAccountGate={openDemoAccountGate}
          onSaved={() => void refresh()}
          canViewFinancials={canFin}
        />
      ) : null}
    </div>
  );
}
