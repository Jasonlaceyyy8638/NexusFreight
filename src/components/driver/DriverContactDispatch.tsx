"use client";

import { Phone } from "lucide-react";

export function DriverContactDispatch() {
  const raw = process.env.NEXT_PUBLIC_COMPANY_MAIN_PHONE?.trim();
  const tel = raw?.replace(/\s/g, "");

  return (
    <section className="rounded-2xl border border-[#007bff]/25 bg-[#007bff]/[0.08] p-4">
      <p className="text-sm font-semibold text-white">Need dispatch?</p>
      <p className="mt-1 text-xs text-slate-400">
        Call your carrier&apos;s office line or the number your dispatcher gave you.
      </p>
      <div className="mt-4">
        {tel ? (
          <a
            href={`tel:${tel}`}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#007bff] px-4 text-sm font-bold text-white shadow-[0_0_20px_rgba(0,123,255,0.3)] transition hover:bg-[#1a8cff]"
          >
            <Phone className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            Call office
          </a>
        ) : (
          <p className="text-xs leading-relaxed text-slate-500">
            No main line is configured for this app build. Use the contact info from
            your carrier or dispatcher.
          </p>
        )}
      </div>
    </section>
  );
}
