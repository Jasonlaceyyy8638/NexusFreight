"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const DESKTOP_ONLY_PATH = "/driver/desktop-only";
const DRIVER_DASHBOARD_PATH = "/driver/dashboard";

/**
 * Viewports 768px and wider: redirect to the desktop-only notice (except dashboard,
 * which shows a QR + mobile prompt instead).
 * Narrow viewports: allow /driver routes; mobile users hitting the notice page are sent back.
 */
export function DriverViewportGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");

    if (pathname === DRIVER_DASHBOARD_PATH) {
      return;
    }

    if (pathname === DESKTOP_ONLY_PATH) {
      if (!mq.matches) {
        router.replace("/driver/dashboard");
      }
      const onNarrow = () => {
        if (!mq.matches) router.replace("/driver/dashboard");
      };
      mq.addEventListener("change", onNarrow);
      return () => mq.removeEventListener("change", onNarrow);
    }

    if (mq.matches) {
      router.replace(DESKTOP_ONLY_PATH);
    }
    const onWide = () => {
      if (mq.matches) router.replace(DESKTOP_ONLY_PATH);
    };
    mq.addEventListener("change", onWide);
    return () => mq.removeEventListener("change", onWide);
  }, [pathname, router]);

  return <>{children}</>;
}
