"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { isTeamAdmin } from "@/lib/permissions";
import type { EldProvider } from "@/types/database";

const PROVIDERS: { id: EldProvider; label: string; hint: string }[] = [
  { id: "samsara", label: "Samsara", hint: "API token from your Samsara dashboard." },
  { id: "motive", label: "Motive", hint: "API key from Fleet admin / developer settings." },
  { id: "geotab", label: "Geotab", hint: "Session or API credentials per Geotab MyGeotab." },
];

export function DashboardIntegrationsPage() {
  const {
    isCarrierOrg,
    carriers,
    eldConnections,
    refresh,
    interactiveDemo,
    profileRole,
    permissions,
  } = useDashboardData();
  const carrierId = carriers[0]?.id ?? null;
  const canConnect =
    isTeamAdmin(profileRole, permissions) || permissions.can_edit_fleet;

  const [modalProvider, setModalProvider] = useState<EldProvider | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!modalProvider) {
      setToken("");
      setFormError(null);
    }
  }, [modalProvider]);

  const onSubmit = useCallback(async () => {
    if (!carrierId || !modalProvider) return;
    const t = token.trim();
    if (!t) {
      setFormError("Paste your API key or access token.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/integrations/telematics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrierId,
          provider: modalProvider,
          accessToken: t,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Could not save integration."
        );
        return;
      }
      setModalProvider(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [carrierId, modalProvider, token, refresh]);

  if (!isCarrierOrg) {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          ELD integrations
        </p>
        <h1 className="text-xl font-semibold text-white">Carrier-only feature</h1>
        <p className="text-sm text-slate-400">
          Electronic logging connections are configured by each carrier organization.
          Sign in with a carrier account to connect Samsara, Motive, or Geotab.
        </p>
        <Link
          href="/dashboard/settings"
          className="inline-flex rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
        >
          Back to settings
        </Link>
      </div>
    );
  }

  if (!carrierId) {
    return (
      <div className="mx-auto max-w-lg px-6 py-10 text-sm text-slate-400">
        No carrier profile found for this organization.
      </div>
    );
  }

  if (interactiveDemo) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-6 py-10">
        <h1 className="text-xl font-semibold text-white">ELD integrations</h1>
        <p className="text-sm text-slate-400">
          Connect real telematics in a signed-in account. Demo mode does not send
          secrets to the server.
        </p>
        <Link
          href="/dashboard/settings"
          className="text-sm text-[#3395ff] hover:underline"
        >
          Back to settings
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Settings
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          ELD &amp; telematics
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Keys are encrypted server-side and stored in{" "}
          <code className="rounded border border-white/10 bg-[#121416] px-1 text-xs">
            telematics_tokens
          </code>
          . A scheduled job refreshes truck GPS every five minutes.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Carrier:{" "}
          <span className="font-medium text-slate-300">{carriers[0]?.name}</span>
        </p>
      </header>

      {!canConnect ? (
        <section className="rounded-xl border border-amber-500/25 bg-amber-950/40 p-5 text-sm text-amber-100/90">
          Your role does not include fleet administration. Ask an admin to connect
          an ELD or grant fleet edit access.
        </section>
      ) : null}

      <ul className="space-y-4">
        {PROVIDERS.map((p) => {
          const connected = eldConnections.some(
            (c) => c.carrier_id === carrierId && c.provider === p.id
          );
          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#16181A]/90 p-5"
            >
              <div>
                <h2 className="text-sm font-semibold text-white">{p.label}</h2>
                <p className="mt-1 text-xs text-slate-500">{p.hint}</p>
                {connected ? (
                  <p className="mt-2 text-xs font-medium text-emerald-400/90">
                    Connected — token stored securely
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={!canConnect}
                onClick={() => setModalProvider(p.id)}
                className="shrink-0 rounded-lg bg-[#007bff] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0066dd] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {connected ? "Update token" : "Connect"}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-slate-500">
        <Link href="/dashboard/settings" className="text-[#3395ff] hover:underline">
          ← Settings
        </Link>
      </p>

      {modalProvider ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="eld-modal-title"
        >
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#1A1C1E] p-6 shadow-2xl">
            <h2 id="eld-modal-title" className="text-lg font-semibold text-white">
              {PROVIDERS.find((x) => x.id === modalProvider)?.label} — API access
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Paste the key or token for this provider. It is encrypted before
              storage and never returned to the browser.
            </p>
            <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-slate-500">
              API key / token
              <input
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="mt-2 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-[#007bff]/50"
                placeholder="••••••••"
              />
            </label>
            {formError ? (
              <p className="mt-3 text-sm text-red-300/95">{formError}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalProvider(null)}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSubmit()}
                className="rounded-lg bg-[#007bff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0066dd] disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
