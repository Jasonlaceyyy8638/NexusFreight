"use client";

type Props = {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

const blueOn =
  "peer-checked:bg-[#007bff] peer-checked:border-[#007bff] peer-focus-visible:ring-2 peer-focus-visible:ring-[#007bff]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#1A1C1E]";

export function PermissionToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: Props) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-[#121416]/80 px-3 py-3 transition-colors hover:border-white/15 ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`block h-6 w-11 rounded-full border border-white/20 bg-white/10 transition-colors ${blueOn}`}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
          aria-hidden
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
