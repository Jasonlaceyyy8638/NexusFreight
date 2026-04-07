"use client";

import { BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { HELP_FAQ_ITEMS, filterFaqs } from "@/lib/help/faq-data";

function FaqBody({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <p className="text-sm leading-relaxed text-slate-400">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-medium text-slate-200">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

export function DashboardHelpCenterPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterFaqs(query, HELP_FAQ_ITEMS),
    [query]
  );

  return (
    <div className="px-6 py-8 text-white">
      <div className="flex flex-wrap items-start gap-3">
        <div className="rounded-xl border border-[#007bff]/30 bg-[#007bff]/10 p-2.5">
          <BookOpen className="h-6 w-6 text-[#5aa9ff]" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Help Center</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Quick answers about carriers, compliance, billing, and daily
            workflows. Search to narrow the list.
          </p>
        </div>
      </div>

      <div className="relative mx-auto mt-8 max-w-2xl">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help articles…"
          className="w-full rounded-xl border border-white/10 bg-[#121416] py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50"
          aria-label="Search FAQs"
        />
      </div>

      <ul className="mx-auto mt-8 max-w-2xl space-y-3">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-white/10 bg-[#16181A]/50 px-4 py-8 text-center text-sm text-slate-500">
            No articles match “{query.trim()}”. Try different keywords or{" "}
            <Link
              href="/dashboard/support"
              className="font-medium text-[#3395ff] hover:underline"
            >
              open a support ticket
            </Link>
            .
          </li>
        ) : (
          filtered.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-white/10 bg-[#16181A]/90 px-5 py-4"
            >
              <h2 className="text-base font-semibold text-slate-100">
                {item.title}
              </h2>
              <div className="mt-2">
                <FaqBody text={item.body} />
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="mx-auto mt-12 max-w-2xl rounded-xl border border-white/10 bg-[#141516]/80 px-5 py-4 text-center text-sm text-slate-400">
        Still need help?{" "}
        <Link
          href="/dashboard/support"
          className="font-semibold text-[#3395ff] hover:underline"
        >
          Open a Support Ticket
        </Link>
      </div>
    </div>
  );
}
