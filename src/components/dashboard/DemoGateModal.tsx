"use client";

import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  body?: string;
};

export function DemoGateModal({
  open,
  onClose,
  title = "Ready to start for real?",
  body = "Create an account to save your own loads, roster, and documents. Your demo data stays separate—go live when you are ready.",
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#16181A] p-8 shadow-[0_32px_100px_-24px_rgba(0,123,255,0.35)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="pr-8 text-xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
          >
            Keep exploring
          </button>
          <Link
            href="/auth/signup"
            className="rounded-lg bg-[#007bff] px-4 py-2.5 text-center text-sm font-bold text-white shadow-[0_0_24px_rgba(0,123,255,0.35)] transition-opacity hover:opacity-90"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
