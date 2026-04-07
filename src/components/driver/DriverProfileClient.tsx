"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDriverPortal } from "@/components/driver/DriverPortalProvider";

export function DriverProfileClient() {
  const router = useRouter();
  const supabase = createClient();
  const { loading, profile } = useDriverPortal();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (!supabase) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-slate-500">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  const phone = profile?.phone_number?.trim() || profile?.phone?.trim() || "—";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">Your NexusFreight driver account</p>
      </header>

      <div className="rounded-2xl border border-white/10 bg-[#16181A] p-5">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-slate-500">Name</dt>
            <dd className="mt-0.5 font-medium text-white">
              {profile?.full_name?.trim() || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Phone</dt>
            <dd className="mt-0.5 font-medium text-slate-200">{phone}</dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        disabled={signingOut}
        onClick={() => void signOut()}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
