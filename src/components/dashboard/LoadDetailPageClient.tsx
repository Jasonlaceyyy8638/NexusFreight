"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadMessageThread } from "@/components/dashboard/LoadMessageThread";
import { LoadQuickAlertButtons } from "@/components/dashboard/LoadQuickAlertButtons";
import { LoadStatusBadge } from "@/components/dashboard/LoadStatusBadge";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import type { Load } from "@/types/database";

export function LoadDetailPageClient({
  load,
  carrierName,
}: {
  load: Load;
  carrierName: string | null;
}) {
  const router = useRouter();
  const { money, permissions, drivers } = useDashboardData();
  const [banner, setBanner] = useState<string | null>(null);
  const driver = load.driver_id
    ? drivers.find((d) => d.id === load.driver_id)
    : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      <div>
        <Link
          href="/dashboard/loads"
          className="text-xs font-medium text-[#3395ff] hover:underline"
        >
          ← All loads
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Load details
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
          {load.origin} → {load.destination}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {carrierName ? `${carrierName} · ` : null}
          {money(load.rate_cents)}
        </p>
      </div>

      {banner ? (
        <div className="rounded-lg border border-white/10 bg-[#16181A] px-4 py-3 text-center text-sm text-slate-300">
          {banner}
        </div>
      ) : null}

      <section className="space-y-3 rounded-xl border border-white/10 bg-[#121416] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Status
        </h2>
        <LoadStatusBadge status={load.status} />
        {load.driver_notified_at ? (
          <p className="text-xs text-slate-500">
            Driver notified{" "}
            {new Date(load.driver_notified_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        ) : null}
        <div className="text-sm text-slate-300">
          <span className="text-slate-500">Driver: </span>
          {driver?.full_name ?? "—"}
        </div>
      </section>

      {load.driver_id ? (
        <section className="space-y-3 rounded-xl border border-white/10 bg-[#121416] p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Driver trip milestones (app)
          </h2>
          <p className="text-xs text-slate-500">
            Driver confirms steps in Nexus Driver. Final step marks the load delivered.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              <span className="text-slate-500">On site pickup:</span>{" "}
              {load.driver_milestone_pickup_at
                ? new Date(load.driver_milestone_pickup_at).toLocaleString()
                : "—"}
            </li>
            <li>
              <span className="text-slate-500">Loaded:</span>{" "}
              {load.driver_milestone_loaded_at
                ? new Date(load.driver_milestone_loaded_at).toLocaleString()
                : "—"}
            </li>
            <li>
              <span className="text-slate-500">On site delivery:</span>{" "}
              {load.driver_milestone_delivery_at
                ? new Date(load.driver_milestone_delivery_at).toLocaleString()
                : "—"}
            </li>
            <li>
              <span className="text-slate-500">Signed BOL:</span>{" "}
              {load.driver_milestone_bol_at
                ? new Date(load.driver_milestone_bol_at).toLocaleString()
                : "—"}
            </li>
          </ul>
        </section>
      ) : null}

      <section className="space-y-3 rounded-xl border border-white/10 bg-[#121416] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Quick Alert (email-to-SMS)
        </h2>
        <p className="text-xs leading-relaxed text-slate-500">
          Sends a plain-text alert to the assigned driver’s phone (carrier
          gateway or SMS). Uses your profile phone as{" "}
          <code className="text-slate-400">{"{{dispatcher_phone}}"}</code> in
          the message. Do not reply — drivers should call or text you directly.
        </p>
        <LoadQuickAlertButtons
          load={load}
          allowDispatch={permissions.can_dispatch_loads}
          onMessage={setBanner}
          onSuccess={() => router.refresh()}
        />
      </section>

      {load.driver_id ? (
        <LoadMessageThread loadId={load.id} orgId={load.org_id} />
      ) : null}

      {load.activity_log && load.activity_log.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-white/10 bg-[#121416] p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Activity log
          </h2>
          <ul className="space-y-2 text-xs text-slate-400">
            {[...load.activity_log].reverse().map((entry, i) => (
              <li key={`${entry.at}-${i}`}>
                <span className="text-slate-600">
                  {new Date(entry.at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {": "}
                </span>
                {entry.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
