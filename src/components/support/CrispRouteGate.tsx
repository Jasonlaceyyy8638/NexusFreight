"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CrispChatScript } from "@/components/support/CrispChatScript";
import { CrispIdentitySync } from "@/components/support/CrispIdentitySync";

/**
 * Driver web routes (`/driver/*`) should not load Crisp (native driver app parity,
 * less third-party JS on the road). Hide the widget if the user navigates here
 * from another page where Crisp had already initialized.
 */
export function CrispRouteGate() {
  const pathname = usePathname() ?? "";
  const hideCrisp = pathname.startsWith("/driver");

  useEffect(() => {
    if (typeof window === "undefined" || !hideCrisp) return;
    const w = window as unknown as { $crisp?: unknown[][] };
    if (!Array.isArray(w.$crisp)) return;
    w.$crisp.push(["do", "chat:hide"]);
  }, [hideCrisp]);

  if (hideCrisp) return null;

  return (
    <>
      <CrispChatScript />
      <CrispIdentitySync />
    </>
  );
}
