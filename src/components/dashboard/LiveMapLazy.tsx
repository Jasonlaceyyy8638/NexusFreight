"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { LiveMap } from "@/components/dashboard/LiveMap";

/** mapbox-gl must not run during SSR (workers / dynamic imports break in Next). */
export const LiveMapLazy = dynamic<ComponentProps<typeof LiveMap>>(
  () =>
    import("@/components/dashboard/LiveMap").then((m) => ({
      default: m.LiveMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[360px] items-center justify-center rounded-xl border border-white/10 bg-[#121416] text-sm text-slate-500"
      >
        Loading map…
      </div>
    ),
  }
);
