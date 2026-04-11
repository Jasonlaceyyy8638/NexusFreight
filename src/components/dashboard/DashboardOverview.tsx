"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { DashboardDesktopOptimizedFooter } from "@/components/dashboard/DashboardDesktopOptimizedFooter";
import { GettingStartedLaunchpad } from "@/components/dashboard/GettingStartedLaunchpad";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { StatCard } from "@/components/dashboard/StatCard";
import { getDispatcherCommissionCentsForLoad } from "@/lib/calculations";

export function DashboardOverview() {
  const { loads, carriers, drivers, trucks, money, isCarrierOrg, permissions } =
    useDashboardData();
  const fin = permissions.can_view_financials;
  const [weekAnchor, setWeekAnchor] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWeekAnchor(Date.now()));
    return () => cancelAnimationFrame(id);
  }, []);

  /** Rolling linehaul (not brokerage commission) for loads dispatched in the last 7 days. */
  const rollingLinehaul7d = useMemo(() => {
    if (!weekAnchor) return 0;
    const weekAgo = weekAnchor - 7 * 24 * 60 * 60 * 1000;
    return loads
      .filter((l) => {
        if (l.status === "cancelled" || !l.dispatched_at) return false;
        const t = new Date(l.dispatched_at).getTime();
        return t >= weekAgo && t <= weekAnchor;
      })
      .reduce((s, l) => s + l.rate_cents, 0);
  }, [loads, weekAnchor]);

  /** Delivered loads in the last 7 days — agency commission from carrier fee profile. */
  const weeklyCommissions7d = useMemo(() => {
    if (!weekAnchor) return 0;
    const weekAgo = weekAnchor - 7 * 24 * 60 * 60 * 1000;
    let total = 0;
    for (const load of loads) {
      if (load.status !== "delivered" || !load.delivered_at) continue;
      const t = new Date(load.delivered_at).getTime();
      if (t < weekAgo || t > weekAnchor) continue;
      const carrier = carriers.find((c) => c.id === load.carrier_id);
      total += getDispatcherCommissionCentsForLoad(load, carrier);
    }
    return total;
  }, [loads, carriers, weekAnchor]);

  /** Carrier-facing: delivered loads — stored driver pay or illustrative share. */
  const driverPayrollEstimate = useMemo(() => {
    let cents = 0;
    for (const load of loads) {
      if (load.status !== "delivered") continue;
      if (load.driver_total_pay_cents != null) {
        cents += load.driver_total_pay_cents;
      } else {
        cents += Math.round(load.rate_cents * 0.42);
      }
    }
    return cents;
  }, [loads]);

  /** Carrier-facing: fuel / overhead placeholder from active and recent dispatched miles proxy. */
  const fuelExpenseEstimate = useMemo(() => {
    const active = loads.filter((l) =>
      ["dispatched", "notification_sent", "in_transit"].includes(l.status)
    ).length;
    return Math.round(rollingLinehaul7d * 0.14 + active * 18500);
  }, [loads, rollingLinehaul7d]);

  const activeLoads = loads.filter((l) =>
    ["dispatched", "notification_sent", "in_transit"].includes(l.status)
  ).length;

  const trucksActive = trucks.filter(
    (t) => t.fleet_status !== "maintenance"
  ).length;
  const trucksMaintenance = trucks.filter(
    (t) => t.fleet_status === "maintenance"
  ).length;
  const trucksUnmarked = trucks.filter(
    (t) => t.fleet_status == null || t.fleet_status === undefined
  ).length;
  const greenCount = trucksActive + trucksUnmarked;
  const redCount = trucksMaintenance;

  const companyName = carriers[0]?.name?.trim() || "Your fleet";

  if (isCarrierOrg) {
    return (
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Carrier Dashboard - {companyName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Availability, overhead signals, and active freight—scoped to your
            authority only.
          </p>
        </header>

        <MarketPulse />

        <section className="rounded-xl border border-white/[0.08] bg-[#16181A]/90 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Truck status
          </h2>
          <div className="mt-4 flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
              <div>
                <p className="text-2xl font-bold tabular-nums text-white">
                  {greenCount}
                </p>
                <p className="text-xs text-slate-500">Active / available</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.45)]" />
              <div>
                <p className="text-2xl font-bold tabular-nums text-white">
                  {redCount}
                </p>
                <p className="text-xs text-slate-500">In maintenance</p>
              </div>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-slate-500">
              Green units are road-ready. Red units are flagged for shop or
              inspection—keep PM windows tight to protect utilization.
            </p>
          </div>
        </section>

        {fin ? (
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Fleet revenue (7d)"
              value={money(rollingLinehaul7d)}
              hint="Total linehaul on your MC — last 7 days (not commission)"
            />
            <StatCard
              label="Driver payroll (est.)"
              value={money(driverPayrollEstimate)}
              hint="Delivered loads × illustrative driver share"
            />
            <StatCard
              label="Fuel & overhead (est.)"
              value={money(fuelExpenseEstimate)}
              hint="Fuel + idle burn proxy from active headhaul"
            />
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Active loads"
            value={String(activeLoads)}
            hint="Dispatched and in transit"
          />
          <StatCard
            label="Fleet units"
            value={String(trucks.length)}
            hint="Trucks on your MC"
          />
          <StatCard
            label="Drivers rostered"
            value={String(drivers.length)}
            hint="Active roster under your MC"
          />
        </section>

        <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/dashboard/fleet"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#007bff] px-4 text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,123,255,0.25)] hover:opacity-90"
          >
            Fleet &amp; maintenance
          </Link>
          <Link
            href="/dashboard/loads"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 text-sm font-medium text-slate-200 hover:border-[#007bff]/40 hover:bg-white/10"
          >
            Loads
          </Link>
          <Link
            href="/dashboard/map"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 text-sm font-medium text-slate-200 hover:border-white/25 hover:bg-white/10"
          >
            Live map
          </Link>
          <Link
            href="/dashboard/documents"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 text-sm font-medium text-slate-200 hover:border-white/25 hover:bg-white/10"
          >
            Compliance &amp; documents
          </Link>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6 shadow-[inset_0_1px_0_0_rgba(0,123,255,0.08)] backdrop-blur-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Maintenance mindset
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Tie ELD health, inspection dates, and shop events to unit numbers in{" "}
            <Link href="/dashboard/fleet" className="text-[#3395ff] hover:underline">
              Fleet
            </Link>
            . NexusFreight keeps maps and payroll signals in one place so you
            can prioritize which trucks return to the lane first.
          </p>
        </section>
        <DashboardDesktopOptimizedFooter />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
        <header className="min-w-0 shrink-0 md:max-w-xs lg:max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Overview
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Operations snapshot
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Key metrics for the last week. Use the sidebar for map, loads, fleet,
            and revenue &amp; settlements.
          </p>
        </header>

        <div className="min-w-0 flex-1">
          <GettingStartedLaunchpad />
        </div>
      </div>

      <MarketPulse />

      <section className="grid gap-4 sm:grid-cols-3">
        {fin ? (
          <>
            <StatCard
              label="Weekly gross"
              value={money(rollingLinehaul7d)}
              hint="Loads dispatched in the last 7 days"
            />
            <StatCard
              label="Weekly commissions"
              value={money(weeklyCommissions7d)}
              hint="Delivered loads in the last 7 days × each carrier service fee"
            />
          </>
        ) : null}
        <StatCard
          label="Active loads"
          value={String(activeLoads)}
          hint="Dispatched and in transit"
        />
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/dashboard/loads"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#007bff] px-4 text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,123,255,0.25)] hover:opacity-90"
        >
          Manage loads
        </Link>
        <Link
          href="/dashboard/map"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 text-sm font-medium text-slate-200 hover:border-[#007bff]/40 hover:bg-white/10"
        >
          Open live map
        </Link>
        <Link
          href="/dashboard/carriers"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 text-sm font-medium text-slate-200 hover:border-white/25 hover:bg-white/10"
        >
          Carriers
        </Link>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6 shadow-[inset_0_1px_0_0_rgba(0,123,255,0.08)] backdrop-blur-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          ELD readiness
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Connect supported ELD providers (e.g. Motive) from{" "}
          <Link
            href="/dashboard/settings/integrations"
            className="text-[#3395ff] hover:underline"
          >
            ELD &amp; telematics
          </Link>{" "}
          so truck positions sync to the live map. Manage trucks and drivers
          under{" "}
          <Link href="/dashboard/fleet" className="text-[#3395ff] hover:underline">
            Fleet
          </Link>
          .
        </p>
      </section>
      <DashboardDesktopOptimizedFooter />
    </div>
  );
}
