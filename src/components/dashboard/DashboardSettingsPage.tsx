"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { createClient } from "@/lib/supabase/client";
import { resolveMapboxTokenFromProcessEnv } from "@/lib/mapbox/resolve-mapbox-env";
import { isTeamAdmin } from "@/lib/permissions";

export function DashboardSettingsPage() {
  const supabase = createClient();
  const { interactiveDemo, profileRole, permissions, isCarrierOrg } =
    useDashboardData();
  const showIntegrations =
    interactiveDemo || isTeamAdmin(profileRole, permissions);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !profile) return;
      const p = profile as { full_name?: string; role?: string };
      setFullName(p.full_name ?? "");
      setRole(p.role ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const mapboxRaw = resolveMapboxTokenFromProcessEnv();
  const mapboxConfigured =
    mapboxRaw.length > 0 && mapboxRaw.startsWith("pk.");

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Settings
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Profile & integrations
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Account details and where API keys are configured for this deployment.
        </p>
      </header>

      <section className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6">
        <h2 className="text-sm font-semibold text-white">Profile</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-500">
              Email
            </dt>
            <dd className="mt-1 text-slate-200">{email || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-500">
              Full name
            </dt>
            <dd className="mt-1 text-slate-200">{fullName || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-500">
              Role
            </dt>
            <dd className="mt-1 text-slate-200">{role || "—"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          Profile updates can be added via Supabase or a future account form.
        </p>
      </section>

      {isCarrierOrg ? (
        <section className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6">
          <h2 className="text-sm font-semibold text-white">
            ELD &amp; telematics
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Connect Samsara, Motive, or Geotab so fleet positions stay in sync with
            the live map.
          </p>
          <Link
            href="/dashboard/settings/integrations"
            className="mt-4 inline-flex rounded-lg border border-[#007bff]/40 bg-[#007bff]/15 px-4 py-2 text-sm font-semibold text-[#7eb8ff] hover:bg-[#007bff]/25"
          >
            Manage integrations →
          </Link>
        </section>
      ) : null}

      {showIntegrations ? (
        <section className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6">
          <h2 className="text-sm font-semibold text-white">API keys (server)</h2>
          <p className="mt-2 text-sm text-slate-400">
            Secrets are never exposed to the browser. Configure them in{" "}
            <code className="rounded border border-white/10 bg-[#121416] px-1 py-0.5 text-xs">
              .env.local
            </code>{" "}
            on the host running Next.js.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li className="flex justify-between gap-4 border-b border-white/5 py-2">
              <span className="text-slate-400">Twilio (dispatch SMS)</span>
              <span className="text-slate-500">TWILIO_*</span>
            </li>
            <li className="flex justify-between gap-4 border-b border-white/5 py-2">
              <span className="text-slate-400">FMCSA lookup</span>
              <span className="text-slate-500">FMCSA_WEB_KEY</span>
            </li>
            <li className="flex justify-between gap-4 py-2">
              <span className="text-slate-400">Mapbox (live map)</span>
              <span className="text-slate-500">
                {mapboxConfigured
                  ? "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN set"
                  : "Not set in this build"}
              </span>
            </li>
          </ul>
        </section>
      ) : (
        <section className="rounded-xl border border-white/10 bg-[#16181A]/50 p-6">
          <h2 className="text-sm font-semibold text-slate-500">
            API keys &amp; integrations
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            This section is available to organization admins only. Ask an admin
            to grant &ldquo;Admin access&rdquo; or use an Admin account if you
            need deployment integration details.
          </p>
        </section>
      )}
    </div>
  );
}
