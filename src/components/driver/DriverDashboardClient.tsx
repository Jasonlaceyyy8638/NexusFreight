"use client";

import { DriverActiveLoadCard } from "@/components/driver/DriverActiveLoadCard";
import { DriverBolUpload } from "@/components/driver/DriverBolUpload";
import { DriverContactDispatch } from "@/components/driver/DriverContactDispatch";
import { DriverDesktopDashboardPromo } from "@/components/driver/DriverDesktopDashboardPromo";
import { useDriverPortal } from "@/components/driver/DriverPortalProvider";
import { useDriverMobileDevice } from "@/lib/hooks/useDriverMobileDevice";

export function DriverDashboardClient() {
  const isMobile = useDriverMobileDevice();
  const {
    loading,
    orgId,
    driverId,
    activeLoad,
    refresh,
  } = useDriverPortal();

  if (!isMobile) {
    return <DriverDesktopDashboardPromo />;
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-slate-500">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  if (!driverId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-white">Welcome</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          Your driver profile isn’t linked to this login yet. Ask your dispatcher
          or safety team to connect your account to your roster in NexusFreight.
        </p>
        <DriverContactDispatch />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-white">Today</h1>
        <p className="mt-1 text-sm text-slate-400">
          Loads and paperwork for your current run.
        </p>
      </header>

      {activeLoad ? (
        <DriverActiveLoadCard load={activeLoad} onUpdated={refresh} />
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-10 text-center">
          <p className="text-base font-medium text-slate-300">No active load</p>
          <p className="mt-2 text-sm text-slate-500">
            When dispatch assigns you, it will show up here.
          </p>
        </div>
      )}

      {orgId ? (
        <DriverBolUpload
          orgId={orgId}
          driverId={driverId}
          loadId={activeLoad?.id ?? null}
        />
      ) : null}

      <DriverContactDispatch />
    </div>
  );
}
