"use client";

import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EldProvider } from "@/types/database";
import { NexusFreightLogo } from "@/components/marketing/NexusFreightLogo";

const BRAND_BG = "#1A1C1E";
const BRAND_ACCENT = "#3B82F6";

const HUB_PROVIDERS: {
  id: EldProvider;
  label: string;
  initials: string;
  blurb: string;
}[] = [
  {
    id: "motive",
    label: "Motive",
    initials: "Mo",
    blurb: "OAuth 2.0 — sign in with your Motive fleet account.",
  },
  {
    id: "samsara",
    label: "Samsara",
    initials: "Sa",
    blurb: "API token for fleet & vehicle data integrations.",
  },
  {
    id: "geotab",
    label: "Geotab",
    initials: "Gt",
    blurb: "MyGeotab API token or database credentials.",
  },
];

const API_KEY_HELP: Record<"samsara" | "geotab", string> = {
  samsara:
    "In the Samsara dashboard: go to Settings → API Tokens (or Developer). Create a read-only API token with scopes needed for vehicle locations. Paste the token here — do not email it.",
  geotab:
    "In MyGeotab: use Administration → Users / API credentials, or your database name and credentials as provided for third-party integrations. Paste the token or credential string your integration expects.",
};

type Phase = "loading" | "invalid" | "ready" | "success";

type InviteMeta = {
  carrierName: string;
  agencyName: string;
  expiresAt: string;
  motiveOAuthReady: boolean;
};

function providerLabelFromQuery(p: string | null): string {
  if (p === "motive") return "Motive";
  if (p === "samsara") return "Samsara";
  if (p === "geotab") return "Geotab";
  return "Your ELD";
}

export function ConnectEldClient(props: {
  token: string;
  queryVerified: boolean;
  queryProvider: string | null;
  queryMotiveError: string | null;
  queryAgency: string | null;
}) {
  const {
    token,
    queryVerified,
    queryProvider,
    queryMotiveError,
    queryAgency,
  } = props;

  const [phase, setPhase] = useState<Phase>(() =>
    queryVerified ? "success" : "loading"
  );
  const [meta, setMeta] = useState<InviteMeta | null>(null);
  const [expandedCard, setExpandedCard] = useState<"samsara" | "geotab" | null>(
    null
  );
  const [apiToken, setApiToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successProvider, setSuccessProvider] = useState<string | null>(() =>
    queryVerified ? providerLabelFromQuery(queryProvider) : null
  );
  const [successAgencyName, setSuccessAgencyName] = useState<string | null>(
    () => (queryVerified ? queryAgency : null)
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!helpRef.current?.contains(e.target as Node)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (queryVerified) {
      setPhase("success");
      setSuccessProvider(providerLabelFromQuery(queryProvider));
      setSuccessAgencyName(queryAgency);
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/eld-invite/${encodeURIComponent(token)}`);
      const body = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setPhase("invalid");
        return;
      }
      const m = body as InviteMeta;
      if (
        !m.carrierName ||
        !m.agencyName ||
        !m.expiresAt ||
        typeof m.motiveOAuthReady !== "boolean"
      ) {
        setPhase("invalid");
        return;
      }
      setMeta(m);
      setPhase("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [token, queryVerified, queryProvider, queryAgency]);

  useEffect(() => {
    if (!queryMotiveError || phase !== "ready") return;
    const err = queryMotiveError;
    setError(
      err === "config"
        ? "Motive sign-in is not configured (set MOTIVE_CLIENT_ID and NEXT_PUBLIC_APP_URL on the server)."
        : err === "token"
          ? "Motive did not return a token. Try again or contact support."
          : "Motive sign-in could not be completed. Try again."
    );
  }, [queryMotiveError, phase]);

  const handleSubmitToken = useCallback(async () => {
    if (!expandedCard) return;
    const k = apiToken.trim();
    if (!k) {
      setError(
        expandedCard === "samsara"
          ? "Enter your Samsara API token."
          : "Enter your Geotab API token or database credentials."
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/eld-invite/${encodeURIComponent(token)}/connect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: expandedCard,
            accessToken: k,
          }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Connection failed."
        );
        return;
      }
      setSuccessProvider(expandedCard === "samsara" ? "Samsara" : "Geotab");
      setSuccessAgencyName(meta?.agencyName ?? null);
      setPhase("success");
    } finally {
      setBusy(false);
    }
  }, [expandedCard, apiToken, token, meta?.agencyName]);

  const startMotive = useCallback(() => {
    if (!meta?.motiveOAuthReady) return;
    window.location.href = `/api/eld-invite/motive/start?invite=${encodeURIComponent(token)}`;
  }, [meta?.motiveOAuthReady, token]);

  const runDevSimulation = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/eld-invite/${encodeURIComponent(token)}/dev-simulate`,
        { method: "POST" }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Simulation failed (enable ELD_DEV_SIMULATION or run in development)."
        );
        return;
      }
      const inserted = (body as { trucksInserted?: number }).trucksInserted ?? 0;
      alert(
        `Demo trucks inserted (${inserted}). Open the dispatcher Live Map to verify.`
      );
    } catch {
      alert("Simulation request failed.");
    }
  }, [token]);

  const cardShell =
    "flex flex-col rounded-2xl border border-white/10 bg-[#16181A]/90 p-5 shadow-lg transition-all duration-200 ease-out hover:z-10 hover:scale-105 hover:border-white/20 hover:shadow-xl";

  return (
    <div
      className="min-h-screen text-slate-200"
      style={{ backgroundColor: BRAND_BG }}
    >
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-12 sm:py-16">
        <header className="mb-10 flex w-full flex-col items-center text-center sm:mb-12">
          <div className="inline-flex flex-col items-center">
            <NexusFreightLogo priority className="h-10 w-auto sm:h-11" />
            <p className="mt-2 text-[10px] font-semibold tracking-[0.28em] text-slate-500">
              ELD CONNECT
            </p>
          </div>
        </header>

        {phase === "loading" ? (
          <p className="text-center text-sm text-slate-500">Loading…</p>
        ) : null}

        {phase === "invalid" ? (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#16181A] p-8 text-center shadow-xl">
            <p className="text-sm text-slate-400">
              This link is invalid, expired, or has already been used. Ask your
              dispatcher to send a new ELD request from their NexusFreight
              account.
            </p>
          </div>
        ) : null}

        {phase === "ready" && meta ? (
          <div className="space-y-8">
            {error && queryMotiveError ? (
              <div
                className="rounded-xl border px-4 py-3 text-sm"
                style={{
                  borderColor: "rgba(239,68,68,0.35)",
                  background: "rgba(127,29,29,0.25)",
                  color: "#fecaca",
                }}
              >
                {error}
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-[#16181A]/95 p-6 shadow-xl sm:p-8">
              <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
                Hello{" "}
                <span className="font-semibold text-white">{meta.carrierName}</span>,{" "}
                <span className="font-semibold text-white">{meta.agencyName}</span> is
                requesting real-time GPS visibility to better manage your loads.
                Select your ELD provider below to connect.
              </p>
              <p className="mt-4 text-xs text-slate-500">
                Link expires{" "}
                {new Date(meta.expiresAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>

            <div>
              <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Select provider
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {HUB_PROVIDERS.map((p) => {
                  const isExpanded =
                    expandedCard === p.id &&
                    (p.id === "samsara" || p.id === "geotab");

                  if (p.id === "motive") {
                    return (
                      <div key={p.id} className={cardShell}>
                        <div
                          className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold"
                          style={{
                            backgroundColor: `${BRAND_ACCENT}33`,
                            color: BRAND_ACCENT,
                          }}
                        >
                          {p.initials}
                        </div>
                        <p className="mt-4 text-center text-base font-semibold text-white">
                          {p.label}
                        </p>
                        <p className="mt-2 flex-1 text-center text-xs leading-relaxed text-slate-500">
                          {p.blurb}
                        </p>
                        <button
                          type="button"
                          disabled={!meta.motiveOAuthReady}
                          onClick={startMotive}
                          className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-45"
                          style={{ backgroundColor: BRAND_ACCENT }}
                        >
                          {meta.motiveOAuthReady
                            ? "Sign in with Motive"
                            : "Motive (needs MOTIVE_CLIENT_ID + app URL)"}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={p.id}
                      className={cardShell}
                      ref={isExpanded ? helpRef : undefined}
                    >
                      {!isExpanded ? (
                        <>
                          <div
                            className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold"
                            style={{
                              backgroundColor: `${BRAND_ACCENT}33`,
                              color: BRAND_ACCENT,
                            }}
                          >
                            {p.initials}
                          </div>
                          <p className="mt-4 text-center text-base font-semibold text-white">
                            {p.label}
                          </p>
                          <p className="mt-2 flex-1 text-center text-xs leading-relaxed text-slate-500">
                            {p.blurb}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setApiToken("");
                              setHelpOpen(false);
                              if (p.id === "samsara" || p.id === "geotab") {
                                setExpandedCard(p.id);
                              }
                            }}
                            className="mt-5 w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/25"
                          >
                            Connect
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-1 flex-col text-left">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">
                              {p.label}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedCard(null);
                                setError(null);
                                setApiToken("");
                              }}
                              className="text-[11px] font-medium text-slate-500 hover:text-slate-300"
                            >
                              Back
                            </button>
                          </div>
                          <label className="mt-3 block text-xs font-medium text-slate-400">
                            {p.id === "samsara"
                              ? "Samsara API token"
                              : "Geotab API token or database credentials"}
                            <input
                              type="password"
                              autoComplete="off"
                              value={apiToken}
                              onChange={(e) => setApiToken(e.target.value)}
                              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0D0E10] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-[#3B82F6]/60"
                              placeholder={
                                p.id === "samsara"
                                  ? "Paste API token"
                                  : "Token or credentials string"
                              }
                            />
                          </label>
                          <div className="relative mt-2">
                            <button
                              type="button"
                              onClick={() => setHelpOpen((h) => !h)}
                              className="text-xs font-medium hover:underline"
                              style={{ color: BRAND_ACCENT }}
                            >
                              Where do I find this?
                            </button>
                            {helpOpen ? (
                              <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-white/10 bg-[#1A1C1E] p-3 text-[11px] leading-relaxed text-slate-400 shadow-2xl">
                                {API_KEY_HELP[p.id]}
                              </div>
                            ) : null}
                          </div>
                          {error && !queryMotiveError ? (
                            <p className="mt-2 text-xs text-red-300/95">
                              {error}
                            </p>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSubmitToken()}
                            className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
                            style={{ backgroundColor: BRAND_ACCENT }}
                          >
                            {busy ? "Saving…" : "Save & connect"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {phase === "success" ? (
          <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-emerald-500/25 bg-emerald-950/30 px-8 py-14 text-center shadow-2xl">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2
                className="h-11 w-11 text-emerald-400"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <h2 className="mt-8 text-2xl font-semibold tracking-tight text-white">
              Connection verified
            </h2>
            <p className="mt-4 text-base leading-relaxed text-emerald-100/90">
              Your fleet is now synced with{" "}
              <span className="font-semibold text-white">
                {successAgencyName ?? "your dispatcher"}
              </span>
              .
            </p>
            <p className="mt-3 text-sm text-emerald-100/70">
              {successProvider ?? "ELD"} is linked. NexusFreight will refresh
              truck locations on the next sync.
            </p>
            <p className="mt-10 text-xs text-slate-500">
              You can close this window.
            </p>
          </div>
        ) : null}

        <footer className="mt-auto flex flex-col items-center gap-3 pt-16 text-center">
          <button
            type="button"
            onClick={() => void runDevSimulation()}
            className="text-[9px] font-medium uppercase tracking-wider text-slate-700 opacity-35 hover:opacity-100 hover:text-slate-400"
          >
            Developer test
          </button>
          <p className="text-[10px] text-slate-600">
            NexusFreight — secure carrier–dispatcher data sharing
          </p>
        </footer>
      </div>
    </div>
  );
}
