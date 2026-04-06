"use client";

import { useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { LoadEntryModal } from "@/components/dashboard/LoadEntryModal";
import { LoadsTable } from "@/components/dashboard/LoadsTable";

export function DashboardLoadsPage() {
  const {
    orgId,
    supabase,
    loads,
    carriers,
    drivers,
    dispatchSms,
    money,
    refresh,
    isCarrierOrg,
    permissions,
  } = useDashboardData();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Loads
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            All loads
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {isCarrierOrg
              ? "Lanes for your fleet only. Dispatch draft loads via SMS when a driver phone is set."
              : "Active and historical lanes. Dispatch draft loads via SMS when a driver phone is set."}
          </p>
        </div>
        <button
          type="button"
          disabled={!permissions.can_dispatch_loads}
          title={
            permissions.can_dispatch_loads
              ? undefined
              : "Requires dispatch permission"
          }
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,123,255,0.25)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          New load
        </button>
      </div>

      <LoadsTable
        loads={loads}
        carriers={carriers}
        drivers={drivers}
        money={money}
        onDispatch={dispatchSms}
        supabase={supabase}
        showDocuments
        showCarrierColumn={!isCarrierOrg}
        allowDispatch={permissions.can_dispatch_loads}
      />

      {orgId ? (
        <LoadEntryModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          orgId={orgId}
          carriers={carriers}
          drivers={drivers}
          onCreated={() => void refresh()}
        />
      ) : null}
    </div>
  );
}
