"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PlatformPathModal } from "@/components/landing/PlatformPathModal";

type Props = {
  /**
   * When true, header background transitions from transparent/blur to solid on scroll.
   * When false, keeps a consistent translucent bar (e.g. home hero).
   */
  scrollDriven?: boolean;
};

export function MarketingSiteHeader({ scrollDriven = true }: Props) {
  const pathname = usePathname();
  const [pathOpen, setPathOpen] = useState(false);
  const [solid, setSolid] = useState(!scrollDriven);

  useEffect(() => {
    if (!scrollDriven) return;
    const sync = () => setSolid(window.scrollY > 20);
    const raf = requestAnimationFrame(sync);
    window.addEventListener("scroll", sync, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", sync);
    };
  }, [scrollDriven]);

  const helpActive = pathname === "/help" || pathname.startsWith("/help/");

  const headerClass = scrollDriven
    ? solid
      ? "border-white/10 bg-[#1A1C1E]/95 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md"
      : "border-transparent bg-[#1A1C1E]/40 backdrop-blur-md"
    : "border-white/10 bg-[#0D0E10]/75 backdrop-blur-md";

  return (
    <>
      <header
        className={`sticky top-10 z-50 border-b transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300 ${headerClass}`}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3.5 font-[family-name:var(--font-inter)] sm:py-4">
          <Link
            href="/"
            className="shrink-0 text-base font-bold tracking-tight text-[#007bff] transition-colors hover:text-[#3395ff] sm:text-lg"
          >
            NexusFreight
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400 sm:gap-x-5">
            <Link
              href="/help"
              className={
                helpActive
                  ? "font-semibold text-white"
                  : "transition-colors hover:text-white"
              }
            >
              Help Center
            </Link>
            <Link
              href="/resources/support"
              className="transition-colors hover:text-white"
            >
              Support
            </Link>
            <button
              type="button"
              onClick={() => setPathOpen(true)}
              className="transition-colors hover:text-white"
            >
              Platform
            </button>
            <Link
              href="mailto:info@nexusfreight.tech?subject=Demo%20Request"
              className="rounded-md border border-white/25 bg-white/5 px-3 py-1.5 font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/10"
            >
              Request Demo
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-md border border-[#007bff]/40 bg-[#007bff]/10 px-3 py-1.5 font-semibold text-slate-100 transition-colors hover:border-[#007bff]/60 hover:bg-[#007bff]/20"
            >
              Join the Beta
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-white/20 px-3 py-1.5 font-medium text-slate-200 transition-colors hover:border-white/40 hover:text-white"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <PlatformPathModal open={pathOpen} onClose={() => setPathOpen(false)} />
    </>
  );
}
