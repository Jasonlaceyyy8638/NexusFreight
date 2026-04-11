"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  BusFront,
  Layers2,
  Package,
  Snowflake,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MarketRatesRow } from "@/types/database";

type RateKey = keyof Pick<
  MarketRatesRow,
  "van_dry" | "reefer" | "flatbed" | "box_truck" | "sprinter" | "power_only"
>;

type EquipmentCardDef = {
  id: string;
  label: string;
  field: RateKey;
  Icon: LucideIcon;
  hint: string;
};

const EQUIPMENT: EquipmentCardDef[] = [
  {
    id: "dry_van",
    label: "Dry Van",
    field: "van_dry",
    Icon: Truck,
    hint: "National dry van spot",
  },
  {
    id: "reefer",
    label: "Reefer",
    field: "reefer",
    Icon: Snowflake,
    hint: "Temperature-controlled est.",
  },
  {
    id: "flatbed",
    label: "Flatbed",
    field: "flatbed",
    Icon: Layers2,
    hint: "Open-deck est.",
  },
  {
    id: "box_truck",
    label: "Box Truck",
    field: "box_truck",
    Icon: Package,
    hint: "Straight box est.",
  },
  {
    id: "cargo_van",
    label: "Cargo Van",
    field: "sprinter",
    Icon: Box,
    hint: "Small-van / expedited tier from the pulse",
  },
  {
    id: "sprinter",
    label: "Sprinter",
    field: "power_only",
    Icon: BusFront,
    hint: "Power-only linehaul estimate from the same pulse run",
  },
];

function parseNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function rowFromRecord(raw: Record<string, unknown>): MarketRatesRow {
  return {
    id: String(raw.id ?? ""),
    as_of: String(raw.as_of ?? ""),
    source: String(raw.source ?? ""),
    van_dry: parseNum(raw.van_dry),
    reefer: parseNum(raw.reefer),
    flatbed: parseNum(raw.flatbed),
    box_truck: parseNum(raw.box_truck),
    sprinter: parseNum(raw.sprinter),
    power_only: parseNum(raw.power_only),
    pro_tip:
      raw.pro_tip == null || raw.pro_tip === ""
        ? null
        : String(raw.pro_tip),
    created_at: String(raw.created_at ?? ""),
  };
}

function fmtPerMi(n: number): string {
  return `$${n.toFixed(2)}/mi`;
}

function pctChange24h(
  current: number,
  previous: number | null | undefined
): number | null {
  if (previous == null || !Number.isFinite(previous) || previous <= 0) {
    return null;
  }
  if (!Number.isFinite(current)) return null;
  return ((current - previous) / previous) * 100;
}

function formatPct(p: number | null): string {
  if (p == null || !Number.isFinite(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(1)}%`;
}

function pctTone(p: number | null): string {
  if (p == null || !Number.isFinite(p)) return "text-slate-500";
  if (p > 0.05) return "text-emerald-400";
  if (p < -0.05) return "text-rose-400";
  return "text-slate-400";
}

export function MarketPulse() {
  const supabase = useMemo(() => createClient(), []);
  const [latest, setLatest] = useState<MarketRatesRow | null>(null);
  const [previous, setPrevious] = useState<MarketRatesRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const loadLastTwo = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("market_rates")
      .select("*")
      .order("as_of", { ascending: false })
      .limit(2);

    if (error) {
      setErr(error.message);
      setLatest(null);
      setPrevious(null);
      return;
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    setLatest(rows[0] ? rowFromRecord(rows[0]) : null);
    setPrevious(rows[1] ? rowFromRecord(rows[1]) : null);
    setErr(null);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setErr("Supabase is not configured.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      await loadLastTwo();
      if (!cancelled) setLoading(false);
    })();

    /** Supabase Realtime (postgres_changes) — same idea as Firebase onSnapshot for instant UI refresh. */
    const channel = supabase
      .channel("dashboard_market_pulse_v1")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "market_rates" },
        () => {
          void loadLastTwo();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [supabase, loadLastTwo]);

  const asOfLabel = useMemo(() => {
    if (!latest?.as_of) return null;
    const d = new Date(latest.as_of);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [latest?.as_of]);

  /** `pro_tip` is the daily insight written by the automated market pulse (DB column). */
  const dailyProTip = latest?.pro_tip?.trim() || null;

  if (loading) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6 backdrop-blur-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Market pulse
        </h2>
        <p className="mt-2 text-sm text-slate-500">Loading benchmarks…</p>
      </section>
    );
  }

  if (err) {
    return (
      <section className="rounded-xl border border-amber-500/25 bg-[#16181A]/90 p-6 backdrop-blur-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Market pulse
        </h2>
        <p className="mt-2 text-sm text-amber-200/90">{err}</p>
      </section>
    );
  }

  if (!latest) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6 backdrop-blur-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Market pulse
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          No pulse data yet. When the morning scanner runs, rates appear here in
          real time.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Market pulse
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {asOfLabel ? `Updated ${asOfLabel}` : "Latest snapshot"}
            {latest.source ? (
              <>
                {" "}
                · <span className="text-slate-600">{latest.source}</span>
              </>
            ) : null}
          </p>
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-400/90">
          Live sync
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {EQUIPMENT.map(({ id, label, field, Icon, hint }) => {
          const rate = latest[field];
          const prevRate = previous?.[field];
          const delta = pctChange24h(rate, prevRate);
          return (
            <div
              key={id}
              className="relative overflow-hidden rounded-xl border border-white/10 bg-[#16181A]/90 p-5 shadow-[inset_0_1px_0_0_rgba(0,123,255,0.1)] backdrop-blur-sm transition-colors hover:border-[#007bff]/30"
            >
              <div
                className="pointer-events-none absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-transparent via-[#007bff]/40 to-transparent"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0f1214] text-[#5eb0ff]">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {label}
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-white">
                      {fmtPerMi(rate)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  24h change
                </span>
                <span
                  className={`text-sm font-semibold tabular-nums ${pctTone(delta)}`}
                >
                  {formatPct(delta)}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-slate-600">
                {hint}
              </p>
            </div>
          );
        })}
      </div>

      {dailyProTip ? (
        <div className="relative overflow-hidden rounded-xl border border-[#007bff]/30 bg-gradient-to-br from-[#0d1524] via-[#12161c] to-[#0f1419] p-6 shadow-[0_0_40px_-12px_rgba(0,123,255,0.35)]">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#007bff]/15 blur-3xl"
            aria-hidden
          />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7ab8ff]">
            Nexus Intelligence
          </p>
          <p className="mt-3 text-base font-medium leading-relaxed text-slate-100">
            {dailyProTip}
          </p>
        </div>
      ) : null}
    </section>
  );
}
