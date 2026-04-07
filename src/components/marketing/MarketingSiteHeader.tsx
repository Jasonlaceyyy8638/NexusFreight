"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NexusFreightLogo } from "@/components/marketing/NexusFreightLogo";
import { NavDesktopAppInstallButton } from "@/components/pwa/NavDesktopAppInstallButton";

const PRODUCT_TOUR_HREF = "/product-tour" as const;

type Props = {
  /**
   * When true, header background transitions from transparent/blur to solid on scroll.
   * When false, keeps a consistent translucent bar (e.g. home hero).
   */
  scrollDriven?: boolean;
};

export function MarketingSiteHeader({ scrollDriven = true }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const helpActive = pathname === "/help" || pathname.startsWith("/help/");

  const headerClass = scrollDriven
    ? solid
      ? "border-white/10 bg-[#1A1C1E]/95 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md"
      : "border-transparent bg-[#1A1C1E]/40 backdrop-blur-md"
    : "border-white/10 bg-[#0D0E10]/75 backdrop-blur-md";

  const closeMobileThenNavigate = () => {
    setMobileOpen(false);
  };

  return (
    <>
      <header
        className={`sticky top-10 z-50 border-b transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300 ${headerClass}`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3.5 font-[family-name:var(--font-inter)] sm:py-4">
          <Link
            href="/"
            className="shrink-0 rounded-xl outline-none ring-offset-2 ring-offset-[#0D0E10] transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50"
          >
            <NexusFreightLogo priority className="h-8 w-auto sm:h-9" />
          </Link>

          <nav
            className="hidden flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400 md:flex md:gap-x-5"
            aria-label="Primary"
          >
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
            <Link
              href={PRODUCT_TOUR_HREF}
              className="transition-colors hover:text-white"
            >
              Product Tour
            </Link>
            <NavDesktopAppInstallButton />
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

          <button
            type="button"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-200 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="marketing-mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div
          id="marketing-mobile-menu"
          className="fixed inset-0 z-[200] flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ease-out"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 ml-auto flex h-full w-full max-w-full flex-col bg-[#1A1C1E] shadow-2xl transition-transform duration-300 ease-out">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <Link
                href="/"
                className="inline-flex rounded-xl outline-none ring-offset-2 ring-offset-[#1A1C1E] focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50"
                onClick={() => setMobileOpen(false)}
              >
                <NexusFreightLogo className="h-9 w-auto" />
              </Link>
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-6 w-6" aria-hidden />
              </button>
            </div>

            <nav
              className="flex flex-1 flex-col gap-1 px-4 pb-10 pt-6"
              aria-label="Mobile"
            >
              <Link
                href={PRODUCT_TOUR_HREF}
                className="min-h-[52px] rounded-xl px-4 py-4 text-xl font-semibold tracking-tight text-white transition-colors hover:bg-white/[0.06]"
                onClick={closeMobileThenNavigate}
              >
                Product Tour
              </Link>
              <Link
                href="/resources/support"
                className="min-h-[52px] rounded-xl px-4 py-4 text-xl font-semibold tracking-tight text-white transition-colors hover:bg-white/[0.06]"
                onClick={() => setMobileOpen(false)}
              >
                Support
              </Link>
              <Link
                href="/help"
                className="min-h-[52px] rounded-xl px-4 py-4 text-xl font-semibold tracking-tight text-white transition-colors hover:bg-white/[0.06]"
                onClick={() => setMobileOpen(false)}
              >
                Help Center
              </Link>
              <div className="mt-6 px-2">
                <Link
                  href="/dashboard"
                  className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#3B82F6] px-4 text-base font-bold text-white shadow-lg shadow-[#3B82F6]/25 transition-colors hover:bg-[#2563EB]"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
              </div>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
