"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { RevealableSecretInput } from "@/components/ui/RevealableSecretInput";
import { createClient } from "@/lib/supabase/client";

const inputFieldClass =
  "w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";

type LinkStatus = "loading" | "ready" | "invalid";

const MIN_PASSWORD_LEN = 8;

export function ResetPasswordClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLinkStatus("invalid");
      return;
    }
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setLinkStatus("ready");
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) markReady();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" && session?.user) markReady();
      if (event === "SIGNED_IN" && session?.user) markReady();
    });

    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        if (session?.user) markReady();
        else setLinkStatus((s) => (s === "ready" ? "ready" : "invalid"));
      });
    }, 8000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [supabase]);

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
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) throw upErr;
      await supabase.auth.signOut();
      router.push("/auth/login?reset=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
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
          New password
        </h1>

        {linkStatus === "loading" ? (
          <p className="mt-6 text-sm text-slate-400">Verifying reset link…</p>
        ) : null}

        {linkStatus === "invalid" ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-amber-200/90">
              This reset link is invalid or has expired. Request a new one from
              the forgot-password page.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block text-sm font-semibold text-[#3395ff] hover:underline"
            >
              Request a new link
            </Link>
            <p>
              <Link
                href="/auth/login"
                className="text-sm text-slate-500 hover:text-slate-400"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        ) : null}

        {linkStatus === "ready" ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
            <p className="text-sm text-slate-400">
              Choose a new password for your account.
            </p>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              New password
              <RevealableSecretInput
                autoComplete="new-password"
                inputClassName={inputFieldClass}
                wrapperClassName="mt-1.5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LEN}
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
                minLength={MIN_PASSWORD_LEN}
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
              {busy ? "Saving…" : "Save password"}
            </button>
          </form>
        ) : null}

        {linkStatus === "ready" ? (
          <p className="mt-8 text-center text-sm text-slate-500">
            <Link
              href="/auth/login"
              className="font-semibold text-[#3395ff] hover:underline"
            >
              Cancel and sign in
            </Link>
          </p>
        ) : null}
      </main>
    </div>
  );
}
