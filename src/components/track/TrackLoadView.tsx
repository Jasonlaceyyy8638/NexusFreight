"use client";

import { useCallback, useEffect, useState } from "react";
import { NexusFreightLogo } from "@/components/marketing/NexusFreightLogo";
import type { DriverLoadResource } from "@/types/api/driver-load";

type ViewState =
  | { kind: "loading" }
  | { kind: "ok"; data: DriverLoadResource }
  | { kind: "err"; message: string };

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function TrackLoadView({ loadId }: { loadId: string }) {
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  const fetchLoad = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/v1/loads/${encodeURIComponent(loadId)}`,
        { credentials: "omit", cache: "no-store" }
      );
      const json: unknown = await res.json().catch(() => null);
      const errMsg =
        json &&
        typeof json === "object" &&
        "error" in json &&
        typeof (json as { error: unknown }).error === "string"
          ? (json as { error: string }).error
          : "Could not load this trip.";
      if (!res.ok) {
        setState({ kind: "err", message: errMsg });
        return;
      }
      const data =
        json &&
        typeof json === "object" &&
        "data" in json &&
        (json as { data: unknown }).data &&
        typeof (json as { data: unknown }).data === "object"
          ? (json as { data: DriverLoadResource }).data
          : null;
      if (
        data &&
        typeof data.id === "string" &&
        typeof data.schema_version === "number"
      ) {
        setState({ kind: "ok", data });
        return;
      }
      setState({ kind: "err", message: "Unexpected response." });
    } catch {
      setState({ kind: "err", message: "Network error. Check your connection." });
    }
  }, [loadId]);

  useEffect(() => {
    void fetchLoad();
  }, [fetchLoad]);

  return (
    <div className="min-h-dvh bg-[var(--nf-neutral)] text-[var(--nf-midnight)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-12 pt-6 sm:px-6">
        <header className="shrink-0">
          <NexusFreightLogo className="h-9 w-auto" />
          <h1 className="mt-8 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            Your load
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Lane and status — optimized for your phone.
          </p>
        </header>

        <main className="mt-8 flex flex-1 flex-col gap-5">
          {state.kind === "loading" ? (
            <section
              className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm"
              aria-busy="true"
              aria-live="polite"
            >
              <p className="text-lg text-slate-600">Loading status…</p>
            </section>
          ) : null}

          {state.kind === "err" ? (
            <section className="rounded-2xl border border-red-200 bg-red-50/80 p-6 shadow-sm">
              <p className="text-lg font-semibold text-red-900">Something went wrong</p>
              <p className="mt-2 text-base text-red-800/90">{state.message}</p>
              <button
                type="button"
                onClick={() => void fetchLoad()}
                className="mt-6 flex min-h-14 w-full items-center justify-center rounded-xl bg-red-700 px-6 text-lg font-semibold text-white shadow-sm active:bg-red-800"
              >
                Try again
              </button>
            </section>
          ) : null}

          {state.kind === "ok" ? (
            <>
              <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </p>
                <p className="mt-3 text-2xl font-bold text-[var(--nf-midnight)] sm:text-3xl">
                  {state.data.status_label}
                </p>
                <div className="mt-8 space-y-5 border-t border-slate-100 pt-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Pickup
                    </p>
                    <p className="mt-2 text-lg font-medium leading-snug sm:text-xl">
                      {state.data.origin}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Delivery
                    </p>
                    <p className="mt-2 text-lg font-medium leading-snug sm:text-xl">
                      {state.data.destination}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Timeline
                </p>
                <ul className="mt-4 space-y-4 text-base text-slate-700">
                  <li className="flex flex-col gap-1">
                    <span className="text-slate-500">Dispatched</span>
                    <span className="font-medium">
                      {formatWhen(state.data.timestamps.dispatched_at)}
                    </span>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="text-slate-500">Driver notified</span>
                    <span className="font-medium">
                      {formatWhen(state.data.timestamps.driver_notified_at)}
                    </span>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="text-slate-500">Delivered</span>
                    <span className="font-medium">
                      {formatWhen(state.data.timestamps.delivered_at)}
                    </span>
                  </li>
                </ul>
              </section>

              <p className="px-1 text-center text-sm leading-relaxed text-slate-600">
                Questions about this load? Call or text your dispatcher — do not
                reply to automated alert messages.
              </p>
            </>
          ) : null}

          <div className="mt-auto flex flex-col gap-3 pt-4">
            <button
              type="button"
              onClick={() => void fetchLoad()}
              disabled={state.kind === "loading"}
              className="flex min-h-14 w-full items-center justify-center rounded-xl bg-[#007bff] px-6 text-lg font-semibold text-white shadow-[0_4px_20px_rgba(0,123,255,0.35)] active:bg-[#0066d6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh status
            </button>
            <a
              href="/"
              className="flex min-h-14 w-full items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-6 text-lg font-semibold text-[var(--nf-midnight)] active:bg-slate-50"
            >
              NexusFreight home
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
