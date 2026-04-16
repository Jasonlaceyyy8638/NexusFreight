"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { requiresDriverPasswordSet } from "@/lib/auth/driver-invite-metadata";

/**
 * Invited drivers get a session from the email link (PKCE / magic link) before
 * they choose a password. Send them to `/auth/driver/set-password` until
 * `user_metadata.nf_password_set` is true.
 */
export function DriverPasswordGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (pathname === "/driver/desktop-only") {
      setAllowed(true);
      return;
    }
    if (!supabase) {
      setAllowed(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setAllowed(true);
        return;
      }
      const meta = user.user_metadata as Record<string, unknown> | undefined;
      if (requiresDriverPasswordSet(meta)) {
        const qs = typeof window !== "undefined" ? window.location.search : "";
        const next = `${pathname}${qs}`;
        router.replace(
          `/auth/driver/set-password?next=${encodeURIComponent(next)}`
        );
        return;
      }
      setAllowed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, supabase]);

  if (allowed === null) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center bg-[#0D0E10] px-4 text-sm text-slate-500">
        <p>Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
