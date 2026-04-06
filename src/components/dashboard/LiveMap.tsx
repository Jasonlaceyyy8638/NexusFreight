"use client";

import { useMemo, useState } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
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
}) {
  const [mapError, setMapError] = useState<string | null>(null);
  const { token, tokenError } = readMapboxToken();

  ensureMapboxWorkerConfigured();

  const multi = Boolean(props.showAllEldCarriers);
  const handshakeIds = useMemo(() => {
    if (props.isCarrierViewer) return null;
    return dispatcherEldHandshakeCarrierIds(props.carriers);
  }, [props.isCarrierViewer, props.carriers]);

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

  const initialView = useMemo(() => {
    if (pings.length === 0) {
      return { longitude: -98.35, latitude: 39.5, zoom: 3.5 };
    }
    const lng = pings.reduce((s, p) => s + p.lng, 0) / pings.length;
    const lat = pings.reduce((s, p) => s + p.lat, 0) / pings.length;
    return { longitude: lng, latitude: lat, zoom: pings.length > 4 ? 4 : 6 };
  }, [pings]);

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
    !handshakeIds.has(props.selectedCarrierId)
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

  if (multi && pings.length === 0) {
    return (
      <div
        className={`flex items-center justify-center px-4 text-center text-sm text-slate-400 ${shellClass}`}
        style={{ height: props.height ?? 360 }}
      >
        {props.isCarrierViewer ? (
          <>
            No trucks with GPS yet on carriers that have an ELD integration.
            Run the ELD sync job after connecting.
          </>
        ) : (
          <>
            No ELD-authorized carriers with live GPS yet. On the Carriers tab,
            use &ldquo;Request ELD sync&rdquo; so the fleet can complete the magic
            link; then the map will show trucks after the next GPS sync.
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

          return (
            <Marker
              key={p.truck.id}
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
                <span className="max-w-[100px] truncate text-[10px] font-medium text-slate-200">
                  {p.truck.unit_number}
                </span>
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
      </Map>
    </div>
  );
}
