"use client";

import Link from "next/link";

type Props = {
  resourceSlug: string;
};

export function ResourceSidebarCta({ resourceSlug }: Props) {
  const trackCta = () => {
    void fetch("/api/public/resources/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: resourceSlug, event: "cta" }),
    }).catch(() => {});
  };

  return (
    <aside className="rounded-xl border border-white/[0.08] bg-[#0D0E10]/90 p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        NexusFreight
      </p>
      <p className="mt-3 text-lg font-semibold leading-snug text-white">
        Ready to automate this workflow?
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Join our Beta and run dispatch, compliance, and carrier workflows from one
        command center.
      </p>
      <Link
        href="/#pricing"
        onClick={trackCta}
        className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[#007bff] px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-[#007bff]/25 transition-colors hover:bg-[#0066dd]"
      >
        Join our Beta
      </Link>
      <p className="mt-4 text-center text-xs text-slate-500">
        <Link
          href="/product-tour"
          className="text-slate-400 underline decoration-white/15 underline-offset-2 transition-colors hover:text-sky-400"
        >
          Product tour
        </Link>
        {" · "}
        <Link
          href="/resources"
          className="text-slate-400 underline decoration-white/15 underline-offset-2 transition-colors hover:text-sky-400"
        >
          All guides
        </Link>
      </p>
    </aside>
  );
}
