"use client";

import Link from "next/link";

/**
 * Shown when the user is signed in but `profiles.org_id` is missing — actions
 * that persist data (carriers, loads, etc.) need an organization workspace.
 */
export function WorkspaceRequiredModal(props: {
  open: boolean;
  onClose: () => void;
  /** Short label for the action they tried, e.g. "add carriers" */
  featureLabel: string;
  /** Optional: call after user may have completed setup elsewhere */
  onRetry?: () => void;
}) {
  const { open, onClose, featureLabel, onRetry } = props;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-required-title"
        className="w-full max-w-md rounded-xl border border-sky-500/25 bg-[#121416] p-6 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]"
      >
        <h2
          id="workspace-required-title"
          className="text-lg font-semibold text-white"
        >
          Organization workspace required
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Your account isn&apos;t linked to an organization yet, so you can&apos;t{" "}
          {featureLabel}. Finish signup (plan + company details) so we can create
          your workspace, or contact support if you already completed checkout.
        </p>
        <ul className="mt-4 list-inside list-disc space-y-1.5 text-sm text-slate-500">
          <li>
            <Link
              href="/auth/signup"
              className="font-medium text-[#3395ff] hover:underline"
            >
              Continue signup
            </Link>{" "}
            — create your organization
          </li>
          <li>
            <a
              href="mailto:info@nexusfreight.tech"
              className="font-medium text-[#3395ff] hover:underline"
            >
              Email info@nexusfreight.tech
            </a>{" "}
            — we&apos;ll link your workspace
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {onRetry ? (
            <button
              type="button"
              onClick={() => {
                onRetry();
                onClose();
              }}
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5"
            >
              Refresh status
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,123,255,0.25)] hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
