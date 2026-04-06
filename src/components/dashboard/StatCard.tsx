export function StatCard(props: {
  label: string;
  value: string;
  hint?: string;
  /** No financials permission — greyed, value hidden */
  locked?: boolean;
}) {
  const locked = Boolean(props.locked);
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-[#16181A]/90 p-6 shadow-[inset_0_1px_0_0_rgba(0,123,255,0.12),0_8px_32px_-8px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-colors ${
        locked
          ? "opacity-55 hover:border-white/10"
          : "hover:border-[#007bff]/35"
      }`}
    >
      <div
        className="pointer-events-none absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-transparent via-[#007bff]/50 to-transparent"
        aria-hidden
      />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {props.label}
      </p>
      <p
        className={`mt-3 text-2xl font-bold tracking-tight tabular-nums ${
          locked ? "text-slate-600" : "text-white"
        }`}
      >
        {locked ? "—" : props.value}
      </p>
      {locked ? (
        <p className="mt-2 text-xs text-slate-600">
          Requires &ldquo;Can view financials&rdquo; permission.
        </p>
      ) : props.hint ? (
        <p className="mt-2 text-xs text-slate-500">{props.hint}</p>
      ) : null}
    </div>
  );
}
