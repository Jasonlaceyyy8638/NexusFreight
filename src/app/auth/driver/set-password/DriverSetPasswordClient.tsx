"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { RevealableSecretInput } from "@/components/ui/RevealableSecretInput";
import { createClient } from "@/lib/supabase/client";
import { requiresDriverPasswordSet } from "@/lib/auth/driver-invite-metadata";

const inputFieldClass =
  "w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";

const MIN_PASSWORD_LEN = 8;

function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/driver/dashboard";
}

export function DriverSetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const nextPath = safeNextPath(searchParams.get("next"));

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      const meta = user?.user_metadata as Record<string, unknown> | undefined;
      if (!user) {
        router.replace(
          `/auth/login?next=${encodeURIComponent(nextPath)}&error=${encodeURIComponent("Sign in with your invite link first.")}`
        );
        return;
      }
      if (!requiresDriverPasswordSet(meta)) {
        router.replace(nextPath);
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router, nextPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    if (password.length < MIN_PASSWORD_LEN) {
      setError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({
        password,
        data: { nf_password_set: true },
      });
      if (upErr) throw upErr;
      await supabase.auth.getSession();
      router.refresh();
      router.replace(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save password.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0D0E10] pt-24 text-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="min-h-screen bg-[#0D0E10] pt-24 text-center text-sm text-red-400">
        {error ?? "Supabase is not configured."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0E10] text-slate-100">
      <MarketingNav />
      <main className="mx-auto max-w-md px-6 pb-24 pt-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Driver account
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Create your password
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Your invite link signed you in once. Set a password so you can sign in
          on this device anytime, including when the link expires.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            New password
            <RevealableSecretInput
              autoComplete="new-password"
              inputClassName={inputFieldClass}
              wrapperClassName="mt-1.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Confirm password
            <RevealableSecretInput
              autoComplete="new-password"
              inputClassName={inputFieldClass}
              wrapperClassName="mt-1.5"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            {busy ? "Saving…" : "Save password and continue"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          <Link href="/auth/forgot-password" className="font-medium text-[#3395ff] hover:underline">
            Forgot password
          </Link>{" "}
          if you already set one.
        </p>
      </main>
    </div>
  );
}
