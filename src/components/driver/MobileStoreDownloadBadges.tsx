"use client";

import Link from "next/link";
import { useId } from "react";
import { useNexusNativeDriverShell } from "@/lib/hooks/useNexusNativeDriverShell";

type Props = {
  className?: string;
  /** Anchor for pre-launch / beta funnel */
  storeHref?: string;
  /** Tighter type and padding for narrow marketing mockups */
  compact?: boolean;
};

/**
 * Full-width App Store / Google Play style badges for mobile web only.
 */
export function MobileStoreDownloadBadges({
  className = "",
  storeHref = "#lead-capture",
  compact = false,
}: Props) {
  const isNative = useNexusNativeDriverShell();
  if (isNative) return null;

  const gap = compact ? "gap-2" : "gap-2.5";
  const pad = compact ? "px-2.5 py-2" : "px-3 py-2.5";
  const icon = compact ? "h-5 w-5" : "h-7 w-7";
  const labelTop = compact ? "text-[8px]" : "text-[9px]";
  const labelMain = compact ? "text-xs" : "text-sm";

  return (
    <div
      className={`flex w-full flex-col ${gap} ${className}`}
      data-driver-app-store-prompt
    >
      <p
        className={`text-center font-medium uppercase tracking-wide text-slate-500 ${compact ? "text-[9px]" : "text-[10px]"}`}
      >
        Get the app
      </p>
      <Link
        href={storeHref}
        className={`block w-full rounded-lg border border-slate-200/90 bg-black ${pad} text-center shadow-sm transition hover:border-white/40 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0b0d]`}
      >
        <span className="sr-only">Download on the App Store</span>
        <span
          className="flex items-center justify-center gap-2"
          aria-hidden
        >
          <svg
            className={`${icon} shrink-0 text-white`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          <span className="min-w-0 text-left leading-tight text-white">
            <span
              className={`block font-medium leading-none text-white/70 ${labelTop}`}
            >
              Download on the
            </span>
            <span
              className={`mt-0.5 block font-semibold tracking-tight ${labelMain}`}
            >
              App Store
            </span>
          </span>
        </span>
      </Link>
      <Link
        href={storeHref}
        className={`block w-full rounded-lg border border-slate-200/90 bg-black ${pad} text-center shadow-sm transition hover:border-white/40 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0b0d]`}
      >
        <span className="sr-only">Get it on Google Play</span>
        <span
          className="flex items-center justify-center gap-2"
          aria-hidden
        >
          <GooglePlayMark className={`${icon} shrink-0`} />
          <span className="min-w-0 text-left leading-tight text-white">
            <span
              className={`block font-medium leading-none text-white/70 ${labelTop}`}
            >
              GET IT ON
            </span>
            <span
              className={`mt-0.5 block font-semibold tracking-tight ${labelMain}`}
            >
              Google Play
            </span>
          </span>
        </span>
      </Link>
    </div>
  );
}

function GooglePlayMark({ className }: { className?: string }) {
  const gradId = `gp-grad-${useId().replace(/:/g, "")}`;
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      aria-hidden
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="4.5"
          y1="16"
          x2="27"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#00C8EB" />
          <stop offset="38%" stopColor="#FFDA44" />
          <stop offset="68%" stopColor="#FF6B35" />
          <stop offset="100%" stopColor="#00E676" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradId})`}
        d="M4.5 5.5 4.5 26.5 27 16 4.5 5.5z"
      />
    </svg>
  );
}
