"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CarrierSelect } from "@/components/dashboard/CarrierSelect";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { isDispatcherPhoneProvided } from "@/lib/phone/dispatcher-phone";
import { createClient } from "@/lib/supabase/client";
import { resolveMapboxTokenFromProcessEnv } from "@/lib/mapbox/resolve-mapbox-env";
import { isTeamAdmin } from "@/lib/permissions";

export function DashboardSettingsPage() {
  const supabase = createClient();
  const {
    interactiveDemo,
    usingDemo,
    profileRole,
    permissions,
    isCarrierOrg,
  } = useDashboardData();
  const dispatcherPhoneRequired =
    permissions.can_dispatch_loads || profileRole === "Dispatcher";
  /** Demo uses full admin flags — still hide vendor / infra detail in preview. */
  const showIntegrationsDetail =
    !usingDemo &&
    !interactiveDemo &&
    isTeamAdmin(profileRole, permissions);
  const isPreviewWorkspace = usingDemo || interactiveDemo;
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCarrier, setPhoneCarrier] = useState("");
  const [mobileBusy, setMobileBusy] = useState(false);
  const [mobileMsg, setMobileMsg] = useState<string | null>(null);
  const [mobileErr, setMobileErr] = useState<string | null>(null);

  const fieldClass =
    "mt-1.5 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, phone, phone_number, phone_carrier")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !profile) return;
      const p = profile as {
        full_name?: string;
        role?: string;
        phone?: string | null;
        phone_number?: string | null;
        phone_carrier?: string | null;
      };
      setFullName(p.full_name ?? "");
      setRole(p.role ?? "");
      setPhone(p.phone_number?.trim() || p.phone?.trim() || "");
      setPhoneCarrier(p.phone_carrier ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function saveMobileProfile() {
    setMobileErr(null);
    setMobileMsg(null);
    if (!supabase) {
      setMobileErr("Sign-in isn’t available in this preview.");
      return;
    }
    if (interactiveDemo) {
      setMobileErr("Not available in demo mode.");
      return;
    }
    if (dispatcherPhoneRequired && !isDispatcherPhoneProvided(phone)) {
      setMobileErr(
        "Enter a valid phone number (at least 10 digits). Required for dispatch SMS to drivers."
      );
      return;
    }
    setMobileBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMobileErr("You must be signed in.");
        return;
      }
      const trimmed = phone.trim() || null;
      const { error } = await supabase
        .from("profiles")
        .update({
          phone_number: trimmed,
          phone: trimmed,
          phone_carrier: phoneCarrier.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
      setMobileMsg("Saved.");
    } catch (e) {
      setMobileErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setMobileBusy(false);
    }
  }

  const mapboxRaw = resolveMapboxTokenFromProcessEnv();
  const mapboxConfigured =
    mapboxRaw.length > 0 && mapboxRaw.startsWith("pk.");

  return (
    <>
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
        {!interactiveDemo && supabase ? (
          <div className="mt-6 border-t border-white/10 pt-6">
            <h3 className="text-sm font-semibold text-white">
              Mobile &amp; driver texts
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              The number drivers see when they get load updates and dispatch texts from
              you. Use a number you&apos;re comfortable sharing on the road.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Dispatch phone number
              {dispatcherPhoneRequired ? (
                <span className="ml-1 font-bold text-amber-200/90">*</span>
              ) : null}
              <input
                className={fieldClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+15551234567"
                autoComplete="tel"
                required={dispatcherPhoneRequired}
                aria-required={dispatcherPhoneRequired}
              />
              {dispatcherPhoneRequired ? (
                <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-600">
                  Required for your role so driver texts show a valid callback number.
                </span>
              ) : null}
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Wireless carrier
              <CarrierSelect
                className={fieldClass}
                value={phoneCarrier}
                onChange={setPhoneCarrier}
              />
            </label>
            {mobileErr ? (
              <p className="mt-2 text-sm text-red-400" role="alert">
                {mobileErr}
              </p>
            ) : null}
            {mobileMsg ? (
              <p className="mt-2 text-sm text-emerald-400/90">{mobileMsg}</p>
            ) : null}
            <button
              type="button"
              disabled={mobileBusy}
              onClick={() => void saveMobileProfile()}
              className="mt-4 rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {mobileBusy ? "Saving…" : "Save mobile settings"}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500">
            Sign in to your NexusFreight account to add or change your dispatch phone
            and carrier.
          </p>
        )}
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

      {showIntegrationsDetail ? (
        <section className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6">
          <h2 className="text-sm font-semibold text-white">
            Connected services
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Your live workspace uses trusted infrastructure for driver texts,
            email, DOT carrier checks, and maps. Credentials stay on our servers,
            not in your browser.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li className="flex justify-between gap-4 border-b border-white/5 py-2">
              <span className="text-slate-400">Driver text alerts</span>
              <span className="text-slate-500">Enabled with your workspace</span>
            </li>
            <li className="flex justify-between gap-4 border-b border-white/5 py-2">
              <span className="text-slate-400">Transactional email</span>
              <span className="text-slate-500">Enabled with your workspace</span>
            </li>
            <li className="flex justify-between gap-4 border-b border-white/5 py-2">
              <span className="text-slate-400">DOT / authority checks</span>
              <span className="text-slate-500">Enabled with your workspace</span>
            </li>
            <li className="flex justify-between gap-4 py-2">
              <span className="text-slate-400">Live map</span>
              <span className="text-slate-500">
                {mapboxConfigured ? "Ready" : "Enabled when your map is connected"}
              </span>
            </li>
          </ul>
        </section>
      ) : isPreviewWorkspace ? (
        <section className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6">
          <h2 className="text-sm font-semibold text-white">
            Connected services
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            In a real account, NexusFreight handles driver texts, office email,
            compliance checks, and live maps for you. This preview doesn&apos;t show
            connection details or configuration.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-white/10 bg-[#16181A]/50 p-6">
          <h2 className="text-sm font-semibold text-slate-500">
            Integrations
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            This section is available to organization admins only. Ask an admin
            to grant &ldquo;Admin access&rdquo; if you need to review integration
            status.
          </p>
        </section>
      )}
    </>
  );
}
