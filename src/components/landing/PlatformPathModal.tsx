"use client";

import { Building2, LayoutDashboard, Truck, X } from "lucide-react";
import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PlatformPathModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="path-modal-title"
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#121416] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-white/10 px-6 pb-4 pt-6 pr-14">
          <h2
            id="path-modal-title"
            className="text-xl font-bold tracking-tight text-white"
          >
            Choose your path
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            NexusFreight adapts to how you run operations—pick the experience that
            matches your role.
          </p>
          <Link
            href="/platform"
            onClick={onClose}
            className="mt-4 inline-flex text-xs font-semibold text-[#3395ff] transition-colors hover:text-blue-400"
          >
            Try interactive demo (no login) →
          </Link>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-white/10 bg-[#16181A] p-5">
            <div className="mb-4 flex h-28 items-center justify-center rounded-lg border border-[#007bff]/20 bg-[#007bff]/5">
              <div className="flex gap-2 text-[#3395ff] opacity-90">
                <LayoutDashboard className="h-10 w-10" strokeWidth={1.25} />
                <Building2 className="h-10 w-10" strokeWidth={1.25} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white">I am a Dispatcher</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Multi-carrier command center: loads, settlements, FMCSA-verified MCs,
              fleet visibility, and dispatch workflows across your book.
            </p>
            <div className="mt-4 flex flex-1 flex-col justify-end gap-2">
              <Link
                href="/auth/signup?type=dispatcher"
                onClick={onClose}
                className="rounded-lg bg-[#007bff] py-2.5 text-center text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,123,255,0.25)] hover:opacity-90"
              >
                Create dispatcher account
              </Link>
              <Link
                href="/dashboard"
                onClick={onClose}
                className="rounded-lg border border-white/15 py-2 text-center text-sm text-slate-300 hover:bg-white/5"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-white/10 bg-[#16181A] p-5">
            <div className="mb-4 flex h-28 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <Truck className="h-12 w-12 text-emerald-400/90" strokeWidth={1.25} />
            </div>
            <h3 className="text-lg font-semibold text-white">I am a Carrier</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Business-first signup with MC verification: fleet map, loads,
              settlements, and document workflows scoped to your authority.
            </p>
            <div className="mt-4 flex flex-1 flex-col justify-end gap-2">
              <Link
                href="/auth/signup?type=carrier"
                onClick={onClose}
                className="rounded-lg bg-emerald-600 py-2.5 text-center text-sm font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:opacity-90"
              >
                Create carrier account
              </Link>
              <Link
                href="/dashboard"
                onClick={onClose}
                className="rounded-lg border border-white/15 py-2 text-center text-sm text-slate-300 hover:bg-white/5"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
