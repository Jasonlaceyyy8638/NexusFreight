export function NewAuthorityBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-amber-500/45 bg-amber-950/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 ${className}`}
      title="Operating authority granted within the last 90 days"
    >
      {"⚠️ NEW AUTHORITY: < 90 Days"}
    </span>
  );
}
