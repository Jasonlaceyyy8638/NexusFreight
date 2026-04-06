import type { LoadStatus } from "@/types/database";

const styles: Record<
  LoadStatus,
  string
> = {
  in_transit:
    "bg-blue-500/20 text-sky-100 border-blue-400/40 shadow-[0_0_14px_rgba(59,130,246,0.45)]",
  delivered:
    "bg-emerald-500/15 text-emerald-100 border-emerald-400/35 shadow-[0_0_14px_rgba(52,211,153,0.42)]",
  draft:
    "bg-slate-600/30 text-slate-300 border-slate-500/40 shadow-[0_0_12px_rgba(148,163,184,0.22)]",
  dispatched:
    "bg-sky-500/18 text-sky-100 border-sky-400/35 shadow-[0_0_12px_rgba(56,189,248,0.38)]",
  cancelled:
    "bg-red-950/40 text-red-200/90 border-red-500/25 shadow-[0_0_10px_rgba(248,113,113,0.2)]",
};

export function LoadStatusBadge({ status }: { status: LoadStatus }) {
  const label = status.replace(/_/g, " ");
  const cls = styles[status] ?? styles.draft;

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}
    >
      {label}
    </span>
  );
}
