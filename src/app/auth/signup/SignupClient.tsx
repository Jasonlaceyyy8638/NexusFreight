"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FmcsaVerifiedBadge } from "@/components/fmcsa/FmcsaVerifiedBadge";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { createClient } from "@/lib/supabase/client";
import { useFmcsaMcLookup } from "@/lib/hooks/useFmcsaMcLookup";
import { isDispatcherPhoneProvided } from "@/lib/phone/dispatcher-phone";

type RoleChoice = "dispatcher" | "carrier" | null;

const inputClass =
  "mt-1.5 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";

export function SignupClient() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const [role, setRole] = useState<RoleChoice>(null);
  const [carrierStep, setCarrierStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [dispatcherPhone, setDispatcherPhone] = useState("");
  const [mcInput, setMcInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get("type");
    if (t === "carrier") {
      setRole("carrier");
      setCarrierStep(1);
    } else if (t === "dispatcher") {
      setRole("dispatcher");
    }
  }, [searchParams]);

  const fmcsa = useFmcsaMcLookup(
    role === "carrier" && carrierStep >= 1 ? mcInput : ""
  );

  const companyName =
    fmcsa.status === "success" ? fmcsa.data.legal_name : "";
  const dotNumber =
    fmcsa.status === "success" ? fmcsa.data.dot_number : "";
  const authorityInactive =
    fmcsa.status === "success" && fmcsa.data.authority_status !== "Active";

  const canCarrierStep1Next =
    role === "carrier" && carrierStep === 1 && fmcsa.status === "success";

  const canSubmitCarrier =
    role === "carrier" &&
    carrierStep === 3 &&
    fmcsa.status === "success" &&
    email.trim() &&
    password.length >= 6;

  const canSubmitDispatcher =
    role === "dispatcher" &&
    email.trim() &&
    password.length >= 6 &&
    isDispatcherPhoneProvided(dispatcherPhone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setDoneMessage(null);

    if (!supabase) {
      setFormError(
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to create an account."
      );
      return;
    }
    if (!role) {
      setFormError("Choose whether you are a dispatcher or a carrier.");
      return;
    }
    if (role === "carrier") {
      if (carrierStep !== 3) {
        setFormError("Complete the business verification steps first.");
        return;
      }
      if (fmcsa.status !== "success") {
        setFormError(
          "FMCSA data is not ready. Go back and re-verify your MC number."
        );
        return;
      }
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      if (role === "dispatcher") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              role_type: "dispatcher",
              full_name: fullName.trim() || undefined,
              agency_name: agencyName.trim() || undefined,
              phone_number: dispatcherPhone.trim(),
            },
          },
        });
        if (error) throw error;
      } else {
        if (fmcsa.status !== "success") {
          setFormError("FMCSA data is not ready. Try again.");
          return;
        }
        const d = fmcsa.data;
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              role_type: "carrier",
              company_name: d.legal_name,
              dot_number: d.dot_number,
              mc_number: d.mc_number || mcInput.replace(/\D/g, ""),
              is_active_authority:
                d.authority_status === "Active" ? "true" : "false",
            },
          },
        });
        if (error) throw error;
      }
      setDoneMessage(
        "Account created. You can sign in from the marketing site or open the dashboard once your email is confirmed (if confirmation is enabled)."
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  const showRolePicker = !searchParams.get("type");

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <MarketingNav />
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Carriers register as a verified business (MC + FMCSA). Dispatchers
          onboard an agency workspace. The first user for a new organization is
          the workspace Admin with full permissions; only admins can change team
          permission toggles for others.
        </p>

        <form className="mt-10 space-y-8" onSubmit={(e) => void handleSubmit(e)}>
          {showRolePicker ? (
            <div>
              <p className="text-sm font-medium text-slate-200">
                Are you a Dispatcher or a Carrier?
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRole("dispatcher");
                    setFormError(null);
                  }}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                    role === "dispatcher"
                      ? "border-[#007bff] bg-[#007bff]/15 text-white"
                      : "border-white/15 bg-white/5 text-slate-300 hover:border-white/25"
                  }`}
                >
                  Dispatcher
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole("carrier");
                    setCarrierStep(1);
                    setFormError(null);
                  }}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                    role === "carrier"
                      ? "border-[#007bff] bg-[#007bff]/15 text-white"
                      : "border-white/15 bg-white/5 text-slate-300 hover:border-white/25"
                  }`}
                >
                  Carrier
                </button>
              </div>
            </div>
          ) : null}

          {role === "carrier" ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Step {carrierStep} of 3 — Business verification
                </span>
                {carrierStep > 1 ? (
                  <button
                    type="button"
                    className="text-[#3395ff] hover:underline"
                    onClick={() =>
                      setCarrierStep((s) => Math.max(1, s - 1))
                    }
                  >
                    Back
                  </button>
                ) : null}
              </div>

              {carrierStep === 1 ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-slate-200">
                    Enter your MC number
                  </p>
                  <p className="text-xs text-slate-500">
                    We pull your legal business name and DOT from FMCSA before
                    you create login credentials.
                  </p>
                  <label className="block text-sm font-medium text-slate-200">
                    MC number
                    <input
                      type="text"
                      className={inputClass}
                      value={mcInput}
                      onChange={(e) => setMcInput(e.target.value)}
                      placeholder="MC-123456 or digits"
                    />
                  </label>
                  {fmcsa.status === "loading" ? (
                    <p className="text-xs text-slate-500">Checking FMCSA…</p>
                  ) : null}
                  {fmcsa.status === "missing_key" ? (
                    <p className="rounded-md border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
                      FMCSA lookup is not configured — set{" "}
                      <code className="text-amber-200/90">FMCSA_WEB_KEY</code> or{" "}
                      <code className="text-amber-200/90">FMCSA_WEBKEY</code> on
                      the server.
                    </p>
                  ) : null}
                  {fmcsa.status === "error" ? (
                    <p className="text-xs text-red-300">{fmcsa.message}</p>
                  ) : null}
                  <button
                    type="button"
                    disabled={!canCarrierStep1Next}
                    onClick={() => setCarrierStep(2)}
                    className="w-full rounded-md bg-[#007bff] py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              ) : null}

              {carrierStep === 2 ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-slate-200">
                    Confirm your business
                  </p>
                  {fmcsa.status === "success" ? (
                    <div className="space-y-3 rounded-lg border border-white/10 bg-[#121416]/80 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Legal business name (FMCSA)
                        </p>
                        <FmcsaVerifiedBadge />
                      </div>
                      <input
                        type="text"
                        readOnly
                        className={`${inputClass} cursor-not-allowed font-medium`}
                        value={companyName}
                        aria-label="Legal business name from FMCSA"
                      />
                      <label className="block text-sm font-medium text-slate-200">
                        U.S. DOT number
                        <input
                          type="text"
                          readOnly
                          className={`${inputClass} cursor-not-allowed opacity-90`}
                          value={dotNumber}
                        />
                      </label>
                      {authorityInactive ? (
                        <p className="text-sm font-medium text-red-400">
                          Warning: Authority is currently inactive. You can still
                          create an account; operations may be limited.
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setCarrierStep(3)}
                        className="w-full rounded-md bg-[#007bff] py-2.5 text-sm font-semibold text-white"
                      >
                        Continue to login credentials
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-red-400">
                      Missing FMCSA data. Go back to step 1.
                    </p>
                  )}
                </div>
              ) : null}

              {carrierStep === 3 ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-slate-200">
                    Link your business profile
                  </p>
                  <p className="text-xs text-slate-500">
                    Use a company email you control. This account represents{" "}
                    <span className="text-slate-300">{companyName}</span>, not an
                    individual as the primary identifier.
                  </p>
                  <label className="block text-sm font-medium text-slate-200">
                    Business email
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-200">
                    Password
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      minLength={6}
                      className={inputClass}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          {role === "dispatcher" ? (
            <>
              <label className="block text-sm font-medium text-slate-200">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Password
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={6}
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Phone number
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  className={inputClass}
                  value={dispatcherPhone}
                  onChange={(e) => setDispatcherPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Required. Used as{" "}
                  <code className="rounded border border-white/10 px-1">
                    {"{{dispatcher_phone}}"}
                  </code>{" "}
                  in automated load SMS to drivers.
                </span>
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Full name (optional)
                <input
                  type="text"
                  autoComplete="name"
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Agency / fleet name (optional)
                <input
                  type="text"
                  className={inputClass}
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="Defaults from your email if empty"
                />
              </label>
              <p className="text-xs text-slate-500">
                Your account becomes the Admin for this new agency; you can invite
                dispatchers and set their permissions in Team management.
              </p>
            </>
          ) : null}

          {formError ? (
            <p className="text-sm text-red-400">{formError}</p>
          ) : null}
          {doneMessage ? (
            <p className="text-sm text-emerald-300">{doneMessage}</p>
          ) : null}

          {role === "dispatcher" ? (
            <button
              type="submit"
              disabled={busy || !canSubmitDispatcher}
              className="w-full rounded-md bg-[#007bff] py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(0,123,255,0.3)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          ) : null}

          {role === "carrier" && carrierStep === 3 ? (
            <button
              type="submit"
              disabled={busy || !canSubmitCarrier}
              className="w-full rounded-md bg-[#007bff] py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(0,123,255,0.3)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Creating…" : "Create business account"}
            </button>
          ) : null}

          <p className="text-center text-sm text-slate-500">
            Already have access?{" "}
            <Link href="/auth/login" className="text-[#3395ff] hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
