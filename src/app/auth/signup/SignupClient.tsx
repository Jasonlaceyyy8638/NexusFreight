"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { FmcsaVerifiedBadge } from "@/components/fmcsa/FmcsaVerifiedBadge";
import type { FmcsaCompanyData } from "@/lib/fmcsa_service";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { createClient } from "@/lib/supabase/client";
import { fetchFmcsaLookupPost } from "@/lib/hooks/useFmcsaMcLookup";
import { isDispatcherPhoneProvided } from "@/lib/phone/dispatcher-phone";
import {
  attachStripeCheckoutSession,
  fetchStripeSignupSessionContext,
} from "@/lib/stripe/signup-checkout-session";
import { RevealableSecretInput } from "@/components/ui/RevealableSecretInput";

type RoleChoice = "dispatcher" | "carrier" | null;

const FMCSA_MC_MIN_DIGITS = 6;

const inputFieldClass =
  "w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";
const inputClass = `mt-1.5 ${inputFieldClass}`;

/** FMCSA service uses snake_case; map once to signup field names (legalName / dotNumber). */
function mapFmcsaResponseToSignupFields(data: FmcsaCompanyData) {
  return {
    legalName: data.legal_name,
    dotNumber: data.dot_number,
    carrier: data,
  };
}

export function SignupClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const stripeSessionId = searchParams.get("session_id");

  const [role, setRole] = useState<RoleChoice>(null);
  const [carrierStep, setCarrierStep] = useState(1);
  const [email, setEmail] = useState("");
  const [stripeEmailLocked, setStripeEmailLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [dotNumber, setDotNumber] = useState("");
  const [dispatcherPhone, setDispatcherPhone] = useState("");
  const [mcInput, setMcInput] = useState("");
  const isFetching = useRef(false);
  /** MC digits `carrierData` was verified for; state so render stays in sync with verification. */
  const [verifiedMcDigits, setVerifiedMcDigits] = useState<string | null>(null);
  const [fmcsaLoading, setFmcsaLoading] = useState(false);
  const [carrierData, setCarrierData] = useState<FmcsaCompanyData | null>(null);
  const [fmcsaError, setFmcsaError] = useState<{
    message: string;
    code?: string;
  } | null>(null);
  const [carrierFullName, setCarrierFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(!!stripeSessionId);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState(false);

  useEffect(() => {
    if (stripeSessionId) return;
    if (typeof window === "undefined") return;
    window.location.replace(`${window.location.origin}/#pricing`);
  }, [stripeSessionId]);

  useEffect(() => {
    if (!stripeSessionId) return;
    if (!supabase) {
      setSessionLoading(false);
      setSessionError(
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to continue."
      );
      return;
    }
    let cancelled = false;
    void (async () => {
      setSessionLoading(true);
      setSessionError(null);
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) {
          const { data: sessWrap } = await supabase.auth.getSession();
          const token = sessWrap.session?.access_token;
          if (token) {
            const attached = await attachStripeCheckoutSession(
              stripeSessionId,
              token
            );
            if (cancelled) return;
            if (attached.ok) {
              router.replace("/dashboard");
              router.refresh();
              return;
            }
            let errMsg = attached.error;
            try {
              const ctx = await fetchStripeSignupSessionContext(
                stripeSessionId
              );
              const signedIn = auth.user?.email?.trim().toLowerCase() ?? "";
              const billing = ctx.email.trim().toLowerCase();
              if (signedIn && billing && signedIn !== billing) {
                errMsg = `You're signed in as ${auth.user.email}. This checkout was completed for ${ctx.email}. Sign out below, then open this same link again—you can create the account for ${ctx.email} or sign in with that address.`;
              }
            } catch {
              /* keep errMsg */
            }
            setSessionError(errMsg);
            setStripeReady(false);
            return;
          }
        }

        const ctx = await fetchStripeSignupSessionContext(stripeSessionId);
        if (cancelled) return;
        setEmail(ctx.email);
        setStripeEmailLocked(true);
        document.cookie = `nexus_signup_plan=${ctx.billingPlan}; Path=/; Max-Age=86400; SameSite=Lax`;
        if (ctx.signupRole === "carrier") {
          setRole("carrier");
          setCarrierStep(1);
        } else {
          setRole("dispatcher");
        }
        setStripeReady(true);
      } catch (e) {
        if (!cancelled) {
          setSessionError(
            e instanceof Error ? e.message : "Could not load checkout session."
          );
        }
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stripeSessionId, supabase, router]);

  const mcDigitsNormalized = mcInput.replace(/\D/g, "");
  const mcDigitCount = mcDigitsNormalized.length;

  const handleMcInputChange = (value: string) => {
    const nextDigits = value.replace(/\D/g, "");
    setMcInput(value);
    const v = verifiedMcDigits;
    if (v !== null && nextDigits !== v) {
      setVerifiedMcDigits(null);
      setCarrierData(null);
      setDotNumber("");
      setAgencyName("");
      setFmcsaError(null);
    }
  };

  const handleCheckMC = async () => {
    if (isFetching.current) {
      return;
    }
    if (!(role === "carrier" && carrierStep === 1)) {
      return;
    }

    const raw = mcInput.trim();
    const digits = raw.replace(/\D/g, "");
    if (!raw || digits.length < FMCSA_MC_MIN_DIGITS) {
      setFmcsaError({
        message: "Enter at least 6 digits before checking.",
      });
      return;
    }

    isFetching.current = true;
    flushSync(() => {
      setFmcsaLoading(true);
      setFmcsaError(null);
    });

    try {
      const result = await fetchFmcsaLookupPost(raw);
      if (!result.ok) {
        const msg =
          result.code === "missing_key"
            ? "Configuration Error: Missing FMCSA Key"
            : typeof result.error === "string"
              ? result.error
              : "MC Number not found. Please verify and try again.";
        console.error("[SignupClient] FMCSA lookup failed", {
          code: result.code,
          error: result.error,
          message: msg,
        });
        setVerifiedMcDigits(null);
        setCarrierData(null);
        setDotNumber("");
        setAgencyName("");
        setFmcsaError({ message: msg, code: result.code });
        return;
      }
      const data = mapFmcsaResponseToSignupFields(result.data);
      setAgencyName(data.legalName);
      setDotNumber(data.dotNumber);
      setCarrierData(data.carrier);
      setVerifiedMcDigits(digits);
      setCarrierStep(2);
      console.log(
        "[SignupClient] FMCSA lookup success",
        data.legalName,
        data.dotNumber
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unexpected error during FMCSA lookup.";
      console.error("[SignupClient] FMCSA lookup exception", err);
      setVerifiedMcDigits(null);
      setCarrierData(null);
      setDotNumber("");
      setAgencyName("");
      setFmcsaError({ message: msg, code: "client_exception" });
    } finally {
      isFetching.current = false;
      setFmcsaLoading(false);
    }
  };

  const resolvedFmcsaData: FmcsaCompanyData | null =
    carrierData &&
    verifiedMcDigits !== null &&
    verifiedMcDigits === mcDigitsNormalized &&
    mcDigitCount >= FMCSA_MC_MIN_DIGITS
      ? carrierData
      : null;

  const isFmcsaVerifiedForMc = resolvedFmcsaData != null;

  const fmcsaPendingStep1 =
    role === "carrier" &&
    carrierStep === 1 &&
    mcDigitCount >= FMCSA_MC_MIN_DIGITS &&
    !isFmcsaVerifiedForMc &&
    !fmcsaLoading &&
    !fmcsaError;

  const companyName =
    resolvedFmcsaData?.legal_name ?? agencyName;
  const authorityInactive =
    resolvedFmcsaData != null &&
    resolvedFmcsaData.authority_status !== "Active";

  const canSubmitCarrier =
    role === "carrier" &&
    carrierStep === 3 &&
    resolvedFmcsaData != null &&
    !fmcsaLoading &&
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
    if (!stripeSessionId) {
      setFormError("Missing checkout session. Start from pricing.");
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
      if (!resolvedFmcsaData) {
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
      let signUpResult: Awaited<ReturnType<typeof supabase.auth.signUp>>;
      if (role === "dispatcher") {
        signUpResult = await supabase.auth.signUp({
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
      } else {
        if (!resolvedFmcsaData) {
          setFormError("FMCSA data is not ready. Try again.");
          return;
        }
        const d = resolvedFmcsaData;
        const fleetName = agencyName.trim() || d.legal_name;
        const dotForSignup = d.dot_number.trim() || dotNumber.trim();
        signUpResult = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              role_type: "carrier",
              company_name: fleetName,
              dot_number: dotForSignup,
              mc_number: d.mc_number || mcInput.replace(/\D/g, ""),
              is_active_authority:
                d.authority_status === "Active" ? "true" : "false",
              full_name: carrierFullName.trim() || undefined,
            },
          },
        });
      }
      if (signUpResult.error) throw signUpResult.error;

      const accessToken = signUpResult.data.session?.access_token;
      if (!accessToken) {
        setDoneMessage(
          "Account created. Confirm your email, then sign in with the same address you used in Stripe — open this page again with your checkout link to finish setup."
        );
        return;
      }

      const attach = await attachStripeCheckoutSession(
        stripeSessionId,
        accessToken
      );
      if (!attach.ok) {
        throw new Error(attach.error);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  if (!stripeSessionId) {
    return (
      <div className="flex min-h-[100dvh] min-h-screen h-full flex-col bg-[#1A1C1E] text-white">
        <MarketingNav />
        <main className="mx-auto max-w-lg px-6 py-16 text-center">
          <p className="text-sm text-slate-400">Redirecting to pricing…</p>
          <Link href="/#pricing" className="mt-4 inline-block text-[#3395ff] hover:underline">
            Go to pricing
          </Link>
        </main>
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="flex min-h-[100dvh] min-h-screen h-full flex-col bg-[#1A1C1E] text-white">
        <MarketingNav />
        <main className="mx-auto max-w-lg px-6 py-16 text-center text-sm text-slate-400">
          Loading your checkout…
        </main>
      </div>
    );
  }

  if (sessionError || !stripeReady) {
    return (
      <div className="flex min-h-[100dvh] min-h-screen h-full flex-col bg-[#1A1C1E] text-white">
        <MarketingNav />
        <main className="mx-auto max-w-lg px-6 py-16">
          <p className="text-sm leading-relaxed text-red-400">
            {sessionError ?? "Invalid session."}
          </p>
          {supabase ? (
            <button
              type="button"
              className="mt-4 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
            >
              Sign out and try again
            </button>
          ) : null}
          <Link
            href="/#pricing"
            className="mt-4 block text-[#3395ff] hover:underline"
          >
            Back to pricing
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] min-h-screen h-full flex-col bg-[#1A1C1E] text-white">
      <MarketingNav />
      <div className="mx-auto flex h-full min-h-screen w-full max-w-lg flex-1 flex-col bg-[#1A1C1E] px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your trial is active in Stripe. Use the same email you entered at
          checkout. Carriers verify MC/DOT with FMCSA before we create your
          workspace.
        </p>

        <form
          className="mt-10 flex flex-1 flex-col space-y-8"
          onSubmit={(e) => {
            if (role === "carrier" && carrierStep < 3) {
              e.preventDefault();
              return;
            }
            void handleSubmit(e);
          }}
        >
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
                    Enter at least <strong className="text-slate-300">6 digits</strong>{" "}
                    (MC numbers are usually 6 or 7). Click{" "}
                    <strong className="text-slate-300">Check MC number now</strong> to
                    verify with FMCSA — legal name and DOT appear on the next step
                    after a successful lookup.
                  </p>
                  <p className="text-xs text-slate-600">
                    Staging without FMCSA: set server env{" "}
                    <code className="rounded border border-white/15 px-1 text-slate-400">
                      FMCSA_MOCK_DOCKET=1234567
                    </code>{" "}
                    (digits only) to return{" "}
                    <strong className="text-slate-400">Nexus Test Carrier</strong>{" "}
                    for that MC. Live lookup uses{" "}
                    <code className="rounded border border-white/15 px-1 text-slate-400">
                      FMCSA_API_KEY
                    </code>{" "}
                    (or{" "}
                    <code className="rounded border border-white/15 px-1 text-slate-400">
                      FMCSA_WEB_KEY
                    </code>
                    ). Local dev defaults to mock MC{" "}
                    <strong className="text-slate-400">1234567</strong> when unset.
                  </p>
                  <label className="block text-sm font-medium text-slate-200">
                    MC number
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className={inputClass}
                      value={mcInput}
                      onChange={(e) => handleMcInputChange(e.target.value)}
                      placeholder="e.g. 123456 or 1234567"
                    />
                  </label>
                  {mcDigitCount > 0 && mcDigitCount < 6 ? (
                    <p className="text-xs text-amber-200/90">
                      Enter at least 6 digits, then click Check MC number now.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={
                        mcDigitCount < FMCSA_MC_MIN_DIGITS || fmcsaLoading
                      }
                      onClick={() => void handleCheckMC()}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {fmcsaLoading ? (
                        <span
                          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-white"
                          aria-hidden
                        />
                      ) : null}
                      {fmcsaLoading ? "Checking…" : "Check MC number now"}
                    </button>
                    <span className="text-[11px] text-slate-600">
                      FMCSA lookup runs only when you click this button
                    </span>
                  </div>
                  {fmcsaLoading ? (
                    <p className="text-xs font-medium text-[#3395ff]">
                      Pulling carrier data from FMCSA…
                    </p>
                  ) : null}
                  {fmcsaError ? (
                    <div
                      className="rounded-md border border-red-500/35 bg-red-950/35 px-3 py-2 text-xs text-red-200"
                      role="alert"
                    >
                      <p className="whitespace-pre-wrap">{fmcsaError.message}</p>
                      {fmcsaError.code ? (
                        <p className="mt-1 font-mono text-[11px] text-red-300/85">
                          code: {fmcsaError.code}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {fmcsaPendingStep1 ? (
                    <p className="text-xs text-slate-500">
                      Click <strong className="text-slate-400">Check MC number now</strong>{" "}
                      to verify. After a match, you&apos;ll move to confirm your business
                      automatically.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {carrierStep === 2 ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-slate-200">
                    Confirm your business
                  </p>
                  {!agencyName.trim() ? (
                    <p
                      className="rounded-md border border-red-500/40 bg-red-950/40 px-4 py-3 text-base font-semibold text-red-300"
                      role="alert"
                    >
                      Data load failed - please try again.
                    </p>
                  ) : null}
                  {resolvedFmcsaData ? (
                    <div className="space-y-3 rounded-lg border border-white/10 bg-[#121416]/80 p-4">
                      <input type="hidden" name="company_name" value={agencyName} />
                      <input type="hidden" name="dot_number" value={dotNumber} />
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Agency / fleet name
                        </p>
                        <FmcsaVerifiedBadge />
                      </div>
                      <label className="block text-sm font-medium text-slate-200">
                        <span className="sr-only">Agency or fleet legal name</span>
                        <input
                          type="text"
                          readOnly
                          className={`${inputClass} cursor-not-allowed font-medium opacity-90`}
                          value={agencyName}
                          onChange={(e) => setAgencyName(e.target.value)}
                          aria-label="Agency or fleet name from FMCSA"
                          aria-readonly="true"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-200">
                        U.S. DOT number
                        <input
                          type="text"
                          readOnly
                          className={`${inputClass} cursor-not-allowed opacity-90`}
                          value={dotNumber}
                          onChange={(e) => setDotNumber(e.target.value)}
                          aria-readonly="true"
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
                        disabled={!agencyName.trim() || !dotNumber.trim()}
                        onClick={() => setCarrierStep(3)}
                        className="w-full rounded-md bg-[#007bff] py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
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
                    <span className="text-slate-300">
                      {agencyName.trim() || companyName}
                    </span>
                    .
                  </p>
                  <input type="hidden" name="company_name" value={agencyName} />
                  <input type="hidden" name="dot_number" value={dotNumber} />
                  <label className="block text-sm font-medium text-slate-200">
                    Your name (optional)
                    <input
                      type="text"
                      autoComplete="name"
                      className={inputClass}
                      value={carrierFullName}
                      onChange={(e) => setCarrierFullName(e.target.value)}
                      placeholder="Primary contact name"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-200">
                    Business email
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      readOnly={stripeEmailLocked}
                      aria-readonly={stripeEmailLocked}
                      className={`${inputClass} ${stripeEmailLocked ? "cursor-not-allowed opacity-90" : ""}`}
                      value={email}
                      onChange={(e) => {
                        if (!stripeEmailLocked) setEmail(e.target.value);
                      }}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-200">
                    Password
                    <RevealableSecretInput
                      required
                      autoComplete="new-password"
                      minLength={6}
                      inputClassName={inputFieldClass}
                      wrapperClassName="mt-1.5"
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
                  readOnly={stripeEmailLocked}
                  aria-readonly={stripeEmailLocked}
                  className={`${inputClass} ${stripeEmailLocked ? "cursor-not-allowed opacity-90" : ""}`}
                  value={email}
                  onChange={(e) => {
                    if (!stripeEmailLocked) setEmail(e.target.value);
                  }}
                />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Password
                <RevealableSecretInput
                  required
                  autoComplete="new-password"
                  minLength={6}
                  inputClassName={inputFieldClass}
                  wrapperClassName="mt-1.5"
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
      </div>
    </div>
  );
}
