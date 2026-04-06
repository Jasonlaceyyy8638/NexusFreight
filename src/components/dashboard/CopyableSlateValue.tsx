"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

type Props = {
  value: string | null | undefined;
  copyLabel: string;
  className?: string;
};

export function CopyableSlateValue({
  value,
  copyLabel,
  className = "",
}: Props) {
  const [copied, setCopied] = useState(false);
  const v = value?.trim();

  const copy = useCallback(async () => {
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }, [v]);

  if (!v) {
    return <span className={`text-slate-600 ${className}`}>—</span>;
  }

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 text-slate-400 tabular-nums ${className}`}
    >
      <span className="min-w-0 truncate" title={v}>
        {v}
      </span>
      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-[#3395ff]"
        aria-label={`Copy ${copyLabel}`}
        title={`Copy ${copyLabel}`}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={2} />
        )}
      </button>
    </span>
  );
}
