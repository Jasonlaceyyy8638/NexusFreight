"use client";

import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone } from "lucide-react";

/**
 * Full-viewport desktop prompt: scan QR to open auth on a phone.
 */
export function DriverDesktopDashboardPromo() {
  const loginUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/auth/signup`;
  }, []);

  return (
    <div className="relative flex min-h-[min(100dvh,920px)] flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,123,255,0.35),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(0,123,255,0.12),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#007bff]/40 bg-gradient-to-br from-[#007bff]/25 to-[#121416] shadow-[0_0_48px_-8px_rgba(0,123,255,0.55)]">
          <Smartphone
            className="h-8 w-8 text-[#5aa9ff]"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>

        <h1 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl md:text-3xl">
          NexusFreight Driver App: Please log in from your mobile device to
          access your loads.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
          The driver workspace is built for phones on the road. Scan the code
          below with your camera to open the sign-in page on your device.
        </p>

        <div className="mt-10 rounded-2xl border border-white/10 bg-[#16181A]/95 p-6 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(0,123,255,0.15)] backdrop-blur-sm">
          <div className="rounded-xl bg-white p-3 shadow-inner">
            {loginUrl ? (
              <QRCodeSVG
                value={loginUrl}
                size={200}
                level="H"
                includeMargin={false}
                className="h-[200px] w-[200px]"
              />
            ) : (
              <div className="h-[200px] w-[200px] animate-pulse bg-slate-200" />
            )}
          </div>
          <p className="mt-4 font-mono text-[11px] text-slate-500 break-all">
            {loginUrl || "…"}
          </p>
        </div>
      </div>
    </div>
  );
}
