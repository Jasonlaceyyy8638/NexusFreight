"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { LiveMapLazy } from "@/components/dashboard/LiveMapLazy";
import { buildDriverAppMapPings } from "@/lib/driver-app/map-pings";

export function DashboardMapPage() {
  const {
    selectedCarrierId,
    setSelectedCarrierId,
    trucks,
    eldConnections,
    carriers,
    isCarrierOrg,
    drivers,
    driverLocations,
  } = useDashboardData();

  const driverAppPings = useMemo(
    () => buildDriverAppMapPings(driverLocations, drivers),
    [driverLocations, drivers]
  );

  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [mapHeight, setMapHeight] = useState(400);
  const [showAllEld, setShowAllEld] = useState(false);

  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setMapHeight(Math.max(320, el.clientHeight));
    });
    ro.observe(el);
    setMapHeight(Math.max(320, el.clientHeight));
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-white/10 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Live map
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Fleet positions
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {isCarrierOrg
            ? "Your fleet only. ELD-linked units show a pulse; Live when pings are fresh."
            : "Per-carrier view, or every carrier that completed the ELD magic link."}
        </p>
        {!isCarrierOrg ? (
          <div className="mt-4 flex max-w-md flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-slate-500">
                Map carrier
              </span>
              <select
                disabled={showAllEld}
                className="rounded-md border border-white/10 bg-[#16181A] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#007bff]/50 disabled:cursor-not-allowed disabled:opacity-40"
                value={selectedCarrierId ?? ""}
                onChange={(e) => setSelectedCarrierId(e.target.value || null)}
              >
                <option value="">— Select carrier —</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={showAllEld}
                onChange={(e) => setShowAllEld(e.target.checked)}
                className="rounded border-white/20"
              />
              Show all ELD-authorized carriers (pulse markers)
            </label>
          </div>
        ) : carriers[0] ? (
          <p className="mt-4 text-xs text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-300">{carriers[0].name}</span>
          </p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 p-4">
        <div
          ref={mapWrapRef}
          className="h-full min-h-[min(60dvh,520px)]"
        >
          <LiveMapLazy
            selectedCarrierId={showAllEld ? null : selectedCarrierId}
            trucks={trucks}
            eldConnections={eldConnections}
            carriers={carriers}
            height={mapHeight}
            isCarrierViewer={isCarrierOrg}
            showAllEldCarriers={!isCarrierOrg && showAllEld}
            driverAppPings={driverAppPings}
          />
        </div>
      </div>
    </div>
  );
}
