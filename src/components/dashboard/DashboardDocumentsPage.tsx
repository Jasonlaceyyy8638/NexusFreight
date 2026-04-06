"use client";

import Link from "next/link";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";

const rows = [
  {
    title: "Certificate of insurance (COI)",
    hint: "Liability and cargo limits as filed with brokers and shippers.",
  },
  {
    title: "IFTA credentials",
    hint: "Quarterly fuel tax decals and account numbers by jurisdiction.",
  },
  {
    title: "Permits & oversize",
    hint: "Trip permits, annuals, and state-specific authority add-ons.",
  },
] as const;

export function DashboardDocumentsPage() {
  const { isCarrierOrg, interactiveDemo, openDemoAccountGate } =
    useDashboardData();

  if (!isCarrierOrg) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 text-center text-sm text-slate-500">
        Authority documents are managed per carrier from the carrier profile in
        the dispatch suite.{" "}
        <Link href="/dashboard/carriers" className="text-[#3395ff] hover:underline">
          Open Carriers
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Compliance &amp; documents
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          IFTA, COI &amp; permits
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Store COI, IFTA, and permit packets in one place. In the live
          product, uploads sync to your org and can be shared on load packets.
        </p>
      </header>

      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.title}
            className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#16181A]/90 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-slate-100">{r.title}</p>
              <p className="mt-1 text-xs text-slate-500">{r.hint}</p>
            </div>
            {interactiveDemo ? (
              <button
                type="button"
                onClick={() => openDemoAccountGate()}
                className="shrink-0 rounded-md border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-[#007bff]/40"
              >
                Upload / manage
              </button>
            ) : (
              <Link
                href="/dashboard/settings"
                className="shrink-0 rounded-md border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-[#007bff]/40"
              >
                Upload / manage
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
