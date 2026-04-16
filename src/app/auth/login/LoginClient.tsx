"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { RevealableSecretInput } from "@/components/ui/RevealableSecretInput";
import { createClient } from "@/lib/supabase/client";

const inputFieldClass =
  "w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";
const inputClass = `mt-1.5 ${inputFieldClass}`;

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/")) return "/dashboard";
  if (raw.startsWith("//")) return "/dashboard";
  return raw;
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const nextPath = safeNextPath(searchParams.get("next"));
  const passwordResetOk = searchParams.get("reset") === "1";
  const isDriverNext = nextPath.startsWith("/driver");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const d = searchParams.get("error_description")?.trim();
    const e = searchParams.get("error")?.trim();
    return d || e || null;
  });

  useEffect(() => {
    const fromUrl =
      searchParams.get("error_description")?.trim() ||
      searchParams.get("error")?.trim();
    if (fromUrl) setError(fromUrl);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError("Supabase is not configured (check NEXT_PUBLIC_SUPABASE_* env).");
      return;
    }
    const em = email.trim();
    if (!em || !password) {
      setError("Enter email and password.");
      return;
    }
    setBusy(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: em,
        password,
      });
      if (signErr) throw signErr;
      // Let the browser client persist the session, then refresh RSC *before* navigation
      // so `/dashboard` server layout sees cookies (avoids “stuck” sign-in / blank shell).
      await supabase.auth.getSession();
      router.refresh();
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
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
          Sign in
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Use the email and password for your NexusFreight account. For Nexus
          Control after signing in, open{" "}
          <span className="text-slate-300">/admin/control-center</span>.
        </p>

        {passwordResetOk ? (
          <p
            className="mt-6 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
            role="status"
          >
            Your password was updated. Sign in with your new password.
          </p>
        ) : null}

        {isDriverNext && !passwordResetOk ? (
          <p className="mt-6 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-slate-300">
            Driver account: use the email your carrier invited and the password you
            set when you completed signup. If the invite link says you already signed
            up, sign in here—use{" "}
            <Link
              href="/auth/forgot-password"
              className="font-medium text-[#3395ff] hover:underline"
            >
              Forgot password
            </Link>{" "}
            if you don&apos;t remember it.
          </p>
        ) : null}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Email
            <input
              type="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@nexusfreight.tech"
              required
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Password
            <RevealableSecretInput
              autoComplete="current-password"
              inputClassName={inputFieldClass}
              wrapperClassName="mt-1.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <p className="text-right text-sm">
            <Link
              href="/auth/forgot-password"
              className="font-medium text-[#3395ff] hover:underline"
            >
              Forgot password?
            </Link>
          </p>
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
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          No account yet?{" "}
          <Link
            href="/auth/signup"
            className="font-semibold text-[#3395ff] hover:underline"
          >
            Create one
          </Link>
        </p>
      </main>
    </div>
  );
}
