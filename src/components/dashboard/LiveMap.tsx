"use client";

import { useMemo, useState } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import type { DriverAppMapPing } from "@/lib/driver-app/map-pings";
import {
  dispatcherEldHandshakeCarrierIds,
  fetchTruckPositionsAllEldCarriers,
  fetchTruckPositionsForCarrier,
  isRecentEldPing,
  isStaleTruckPing,
  minutesSincePing,
} from "@/lib/eld/truck-positions";
import { ensureMapboxWorkerConfigured } from "@/lib/mapbox/configure-mapbox-worker";
import { resolveMapboxTokenFromProcessEnv } from "@/lib/mapbox/resolve-mapbox-env";
import type { Carrier, EldConnection, Truck } from "@/types/database";

const shellClass =
  "overflow-hidden rounded-xl border border-white/10 bg-[#121416] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)]";

const MAPBOX_SETUP_HINT =
  "Create a file named .env.local in the project root (next to package.json), not only .env.example. Add a public token (starts with pk.) using one of: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN, MAPBOX_ACCESS_TOKEN, or MAPBOX_TOKEN. Then stop and restart npm run dev.";

function readMapboxToken(): { token?: string; tokenError?: string } {
  const raw = resolveMapboxTokenFromProcessEnv();
  if (!raw) {
    return { tokenError: MAPBOX_SETUP_HINT };
  }
  if (!raw.startsWith("pk.")) {
    return {
      tokenError:
        "Mapbox tokens in the browser must be a public token starting with pk. (create one in Mapbox Studio → Tokens). Secret sk. tokens will not load the map here.",
    };
  }
  return { token: raw };
}

export function LiveMap(props: {
  selectedCarrierId: string | null;
  trucks: Truck[];
  eldConnections: EldConnection[];
  carriers: Carrier[];
  height?: number;
  /** Carrier org: no dispatcher handshake gate on the map */
  isCarrierViewer?: boolean;
  /** Dispatcher: merge all carriers that have an ELD connection */
  showAllEldCarriers?: boolean;
  /** Phone GPS from the native driver app (`driver_locations`). */
  driverAppPings?: DriverAppMapPing[];
}) {
  const [mapError, setMapError] = useState<string | null>(null);
  const { token, tokenError } = readMapboxToken();

  ensureMapboxWorkerConfigured();

  const multi = Boolean(props.showAllEldCarriers);
  const handshakeIds = useMemo(() => {
    if (props.isCarrierViewer) return null;
    return dispatcherEldHandshakeCarrierIds(props.carriers);
  }, [props.isCarrierViewer, props.carriers]);

  const driverPingsFiltered = useMemo(() => {
    const raw = props.driverAppPings ?? [];
    if (props.isCarrierViewer) {
      const cid = props.selectedCarrierId ?? props.carriers[0]?.id ?? null;
      if (!cid) return [];
      return raw.filter((p) => p.carrierId === cid);
    }
    if (multi) {
      const allowed = new Set(props.carriers.map((c) => c.id));
      return raw.filter((p) => allowed.has(p.carrierId));
    }
    const cid = props.selectedCarrierId;
    if (!cid) return [];
    return raw.filter((p) => p.carrierId === cid);
  }, [
    props.driverAppPings,
    props.isCarrierViewer,
    props.selectedCarrierId,
    props.carriers,
    multi,
  ]);

  const driverPingsForGate = useMemo(() => {
    if (multi || !props.selectedCarrierId) return [];
    return (props.driverAppPings ?? []).filter(
      (p) => p.carrierId === props.selectedCarrierId
    );
  }, [multi, props.selectedCarrierId, props.driverAppPings]);

  const pings = useMemo(() => {
    if (multi) {
      return fetchTruckPositionsAllEldCarriers({
        trucks: props.trucks,
        eldConnections: props.eldConnections,
        handshakeCarrierIds: handshakeIds ?? new Set(),
      });
    }
    const carrierId = props.selectedCarrierId;
    if (!carrierId) return [];
    return fetchTruckPositionsForCarrier({
      trucks: props.trucks,
      eldConnections: props.eldConnections,
      carrierId,
      dispatcherHandshakeIds: handshakeIds,
    });
  }, [
    multi,
    props.trucks,
    props.eldConnections,
    props.selectedCarrierId,
    handshakeIds,
  ]);

  const carrierNameById = useMemo(() => {
    const m = new globalThis.Map<string, string>();
    for (const c of props.carriers) {
      m.set(c.id, c.name.trim());
    }
    return m;
  }, [props.carriers]);

  /** Agency / broker / dispatcher: show authority name on each driver-app pin. */
  const showCarrierOnDriverPing = !props.isCarrierViewer;

  const initialView = useMemo(() => {
    const pts: { lng: number; lat: number }[] = [
      ...pings.map((p) => ({ lng: p.lng, lat: p.lat })),
      ...driverPingsFiltered.map((p) => ({ lng: p.lng, lat: p.lat })),
    ];
    if (pts.length === 0) {
      return { longitude: -98.35, latitude: 39.5, zoom: 3.5 };
    }
    const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    return { longitude: lng, latitude: lat, zoom: pts.length > 4 ? 4 : 6 };
  }, [pings, driverPingsFiltered]);

  if (!token) {
    return (
      <div
        className={`flex items-center justify-center px-4 text-center text-sm text-slate-400 ${shellClass}`}
        style={{ height: props.height ?? 360 }}
      >
        {tokenError ?? "Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable the live map."}
      </div>
    );
  }

  if (!multi && !props.selectedCarrierId) {
    return (
      <div
        className={`flex items-center justify-center border-dashed border-white/20 text-sm text-slate-400 ${shellClass}`}
        style={{ height: props.height ?? 360 }}
      >
        Select a carrier to view fleet positions. Dispatcher maps are scoped per
        carrier profile to prevent data overlap, or enable &ldquo;all ELD-linked
        carriers&rdquo; above.
      </div>
    );
  }

  if (
    !props.isCarrierViewer &&
    !multi &&
    props.selectedCarrierId &&
    handshakeIds &&
    !handshakeIds.has(props.selectedCarrierId) &&
    driverPingsForGate.length === 0
  ) {
    return (
      <div
        className={`flex items-center justify-center px-4 text-center text-sm text-slate-400 ${shellClass}`}
        style={{ height: props.height ?? 360 }}
      >
        This carrier has not completed the ELD authorization link. On the{" "}
        <span className="text-slate-300">Carriers</span> tab, click{" "}
        <span className="text-slate-300">Request ELD sync</span> to email them a
        secure connect link.
      </div>
    );
  }

  if (multi && pings.length === 0 && driverPingsFiltered.length === 0) {
    return (
      <div
        className={`flex items-center justify-center px-4 text-center text-sm text-slate-400 ${shellClass}`}
        style={{ height: props.height ?? 360 }}
      >
        {props.isCarrierViewer ? (
          <>
            No trucks with ELD GPS and no driver-app positions yet. Connect ELD
            or have drivers sign in on the mobile app.
          </>
        ) : (
          <>
            No ELD-authorized carriers with live truck GPS yet, and no driver-app
            positions for this view. Complete ELD sync on the Carriers tab, or
            have drivers share location from the app.
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative ${shellClass}`}
      style={{ height: props.height ?? 360 }}
    >
      {mapError ? (
        <div className="absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)] rounded-md border border-amber-500/35 bg-amber-950/90 px-2 py-1.5 text-xs text-amber-100">
          Map: {mapError}
        </div>
      ) : null}
      <Map
        mapboxAccessToken={token}
        initialViewState={{
          ...initialView,
          bearing: 0,
          pitch: 0,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onLoad={() => setMapError(null)}
        onError={(e) => {
          const msg =
            e.error?.message ||
            (typeof e.error === "string" ? e.error : "Failed to load map");
          setMapError(msg);
        }}
      >
        {pings.map((p) => {
          const live =
            p.carrierHasEld && isRecentEldPing(p.lastPingAt);
          const stale = isStaleTruckPing(p.lastPingAt);
          const minsAgo = minutesSincePing(p.lastPingAt);
          const pulse = p.carrierHasEld && p.source === "eld";
          const truckCarrierLabel =
            showCarrierOnDriverPing && multi
              ? carrierNameById.get(p.truck.carrier_id) ?? null
              : null;

          return (
            <Marker
              key={`truck-${p.truck.id}`}
              longitude={p.lng}
              latitude={p.lat}
              anchor="bottom"
            >
              <div className="flex flex-col items-center gap-0.5">
                <div className="relative flex h-8 w-8 items-center justify-center">
                  {pulse ? (
                    <span
                      className="absolute inline-flex h-full w-full rounded-full bg-[#007bff] opacity-40 animate-ping"
                      aria-hidden
                    />
                  ) : null}
                  <div
                    className={`relative z-[1] h-3 w-3 rounded-sm border border-white shadow-[0_0_12px_rgba(0,123,255,0.65)] ring-1 ring-black/40 ${
                      pulse ? "bg-[#007bff]" : "bg-slate-500"
                    }`}
                  />
                </div>
                <span className="max-w-[120px] truncate text-center text-[10px] font-medium text-slate-200">
                  {p.truck.unit_number}
                </span>
                {truckCarrierLabel ? (
                  <span
                    className="max-w-[140px] truncate text-center text-[9px] font-medium leading-tight text-slate-400"
                    title={truckCarrierLabel}
                  >
                    {truckCarrierLabel}
                  </span>
                ) : null}
                {live ? (
                  <span className="rounded bg-emerald-600/95 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
                    Live
                  </span>
                ) : null}
                {stale && minsAgo != null ? (
                  <span className="max-w-[120px] text-center text-[9px] leading-tight text-amber-200/95">
                    Last seen: {minsAgo} min ago
                  </span>
                ) : null}
              </div>
            </Marker>
          );
        })}
        {driverPingsFiltered.map((p) => {
          const stale = isStaleTruckPing(p.lastPingAt);
          const minsAgo = minutesSincePing(p.lastPingAt);
          const live = isRecentEldPing(p.lastPingAt);
          const carrierLabel = showCarrierOnDriverPing
            ? carrierNameById.get(p.carrierId) ?? null
            : null;

          return (
            <Marker
              key={`driver-${p.driverId}`}
              longitude={p.lng}
              latitude={p.lat}
              anchor="bottom"
            >
              <div className="flex flex-col items-center gap-0.5">
                <div className="relative flex h-8 w-8 items-center justify-center">
                  {live ? (
                    <span
                      className="absolute inline-flex h-full w-full rounded-full bg-cyan-400/35 animate-ping"
                      aria-hidden
                    />
                  ) : null}
                  <div className="relative z-[1] h-3.5 w-3.5 rounded-full border-2 border-white bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.75)] ring-1 ring-black/40" />
                </div>
                <span className="max-w-[140px] truncate text-center text-[10px] font-medium text-cyan-100">
                  {p.fullName}
                </span>
                {carrierLabel ? (
                  <span
                    className="max-w-[140px] truncate text-center text-[9px] font-medium leading-tight text-slate-400"
                    title={carrierLabel}
                  >
                    {carrierLabel}
                  </span>
                ) : null}
                <span className="rounded bg-cyan-600/90 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
                  App
                </span>
                {stale && minsAgo != null ? (
                  <span className="max-w-[120px] text-center text-[9px] leading-tight text-amber-200/95">
                    Last seen: {minsAgo} min ago
                  </span>
                ) : null}
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
