"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { createClient } from "@/lib/supabase/client";

const inputFieldClass =
  "w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";
const inputClass = `mt-1.5 ${inputFieldClass}`;

export function ForgotPasswordClient() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError("Supabase is not configured (check NEXT_PUBLIC_SUPABASE_* env).");
      return;
    }
    const em = email.trim();
    if (!em) {
      setError("Enter your account email.");
      return;
    }
    setBusy(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin.replace(/\/$/, "")}/auth/reset-password`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        em,
        { redirectTo }
      );
      if (resetErr) throw resetErr;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E10] text-slate-100">
      <MarketingNav />
      <main className="mx-auto max-w-md px-6 pb-24 pt-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Reset password
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the email you use for NexusFreight. If it matches an account,
          you will receive a link to choose a new password.
        </p>

        {sent ? (
          <div
            className="mt-8 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
            role="status"
          >
            Check your inbox for an email from NexusFreight with a reset link.
            It may take a minute to arrive. You can close this tab after you
            finish.
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email
              <input
                type="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </label>
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-[#007bff] px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(0,123,255,0.25)] hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-slate-500">
          <Link
            href="/auth/login"
            className="font-semibold text-[#3395ff] hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
