"use client";

import { MessageCircle, Phone } from "lucide-react";
import { openCrispChat } from "@/lib/support/open-crisp-chat";

export function DriverContactDispatch() {
  const raw = process.env.NEXT_PUBLIC_COMPANY_MAIN_PHONE?.trim();
  const tel = raw?.replace(/\s/g, "");

  return (
    <section className="rounded-2xl border border-[#007bff]/25 bg-[#007bff]/[0.08] p-4">
      <p className="text-sm font-semibold text-white">Need dispatch?</p>
      <p className="mt-1 text-xs text-slate-400">
        Chat with support or call your main line if you have one on file.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => openCrispChat()}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#007bff] px-4 text-sm font-bold text-white shadow-[0_0_20px_rgba(0,123,255,0.3)] transition hover:bg-[#1a8cff]"
        >
          <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          Chat with dispatch
        </button>
        {tel ? (
          <a
            href={`tel:${tel}`}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/10"
          >
            <Phone className="h-5 w-5 shrink-0 text-[#007bff]" strokeWidth={2} aria-hidden />
            Call office
          </a>
        ) : null}
      </div>
    </section>
  );
}
