"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import {
  driverRosterLabel,
  normalizeDriverRosterStatus,
} from "@/lib/driver-roster-status";
import type { Driver } from "@/types/database";

const inputClass =
  "mt-1.5 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";

export function FleetDriversPage() {
  const router = useRouter();
  const {
    drivers,
    carriers,
    isCarrierOrg,
    interactiveDemo,
    openDemoAccountGate,
    permissions,
    selectedCarrierId,
    setSelectedCarrierId,
    refresh,
  } = useDashboardData();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!interactiveDemo && !isCarrierOrg) {
      router.replace("/dashboard");
    }
  }, [interactiveDemo, isCarrierOrg, router]);

  const canInvite =
    interactiveDemo ||
    (permissions.admin_access || permissions.can_edit_fleet);

  const carrierId =
    selectedCarrierId ?? carriers[0]?.id ?? "";

  const carrierName = (id: string) =>
    carriers.find((c) => c.id === id)?.name ?? "—";

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setMsg(null);
      setErr(null);
      if (interactiveDemo) {
        openDemoAccountGate();
        return;
      }
      if (!canInvite) {
        setErr("You do not have permission to invite drivers.");
        return;
      }
      const em = email.trim().toLowerCase();
      if (!em || !em.includes("@")) {
        setErr("Enter a valid email address.");
        return;
      }
      if (!carrierId) {
        setErr("Select a carrier authority first.");
        return;
      }
      setBusy(true);
      try {
        const res = await fetch("/api/fleet/invite-driver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: em,
            full_name: fullName.trim(),
            carrier_id: carrierId,
          }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          via?: string;
        };
        if (!res.ok) {
          setErr(typeof j.error === "string" ? j.error : "Invite failed.");
          return;
        }
        setEmail("");
        setFullName("");
        setMsg(
          typeof j.message === "string" && j.message.trim()
            ? j.message
            : j.via === "magic_link_existing_email"
              ? "That email already had an account—we sent a sign-in link instead."
              : "Invite sent. The driver will appear in your roster after they accept the email and set a password."
        );
        await refresh();
      } catch {
        setErr("Invite request failed.");
      } finally {
        setBusy(false);
      }
    },
    [
      interactiveDemo,
      openDemoAccountGate,
      canInvite,
      email,
      fullName,
      carrierId,
      refresh,
    ]
  );

  if (!interactiveDemo && !isCarrierOrg) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-slate-500">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Fleet
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Drivers
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Invite drivers by email so they get a mobile login scoped to your
          carrier. They only see loads you assign to them.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          For trucks, CDL, and pay settings, use{" "}
          <Link
            href="/dashboard/fleet"
            className="font-semibold text-[#3395ff] hover:underline"
          >
            Drivers &amp; Trucks
          </Link>
          .
        </p>
      </header>

      {canInvite ? (
        <section className="rounded-xl border border-white/10 bg-[#121416] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Invite driver
          </h2>
          <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-4">
            {carriers.length > 1 ? (
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Authority
                <select
                  className={inputClass}
                  value={carrierId}
                  onChange={(e) => setSelectedCarrierId(e.target.value)}
                >
                  {carriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email
              <input
                type="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@example.com"
                required
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Name (optional)
              <input
                className={inputClass}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Shown in the app and on documents"
              />
            </label>
            {err ? (
              <p className="text-sm font-medium text-red-400">{err}</p>
            ) : null}
            {msg ? (
              <p className="text-sm font-medium text-emerald-400/90">{msg}</p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[#007bff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(0,123,255,0.3)] hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Sending…" : "Send invite"}
            </button>
          </form>
        </section>
      ) : (
        <p className="text-sm text-slate-500">
          Ask a workspace admin to grant fleet editing permission to send driver
          invites.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Roster
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#121416]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-[#16181A] text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Authority</th>
                <th className="px-4 py-3 font-semibold">Roster</th>
                <th className="px-4 py-3 font-semibold">Mobile app</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No drivers yet. Add roster details under Drivers &amp; Trucks
                    or send an invite above.
                  </td>
                </tr>
              ) : (
                drivers.map((d: Driver, i) => {
                  const linked = Boolean(d.auth_user_id?.trim());
                  return (
                    <tr
                      key={d.id}
                      className={
                        i % 2 === 0
                          ? "border-b border-white/[0.06] bg-[#1A1C1E]"
                          : "border-b border-white/[0.06] bg-[#16181A]/90"
                      }
                    >
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {d.full_name}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {(d.contact_email ?? "").trim() || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {carrierName(d.carrier_id)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {driverRosterLabel(
                          normalizeDriverRosterStatus(d.status)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            linked
                              ? "font-medium text-emerald-400/90"
                              : "text-slate-500"
                          }
                        >
                          {linked ? "Linked" : "Not linked"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
