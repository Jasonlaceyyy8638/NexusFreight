"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

export type RevealableSecretInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  /** Classes for the input (width, border, padding — add `pr-10` space is applied automatically). */
  inputClassName: string;
  /** Wrapper spacing (default matches auth forms). */
  wrapperClassName?: string;
  showRevealLabel?: string;
  hideRevealLabel?: string;
};

/**
 * Password or API token field with a show/hide toggle so users can verify what they typed.
 */
export function RevealableSecretInput({
  inputClassName,
  wrapperClassName = "mt-1.5",
  showRevealLabel = "Show password",
  hideRevealLabel = "Hide password",
  id: idProp,
  value,
  ...rest
}: RevealableSecretInputProps) {
  const [visible, setVisible] = useState(false);
  const genId = useId();
  const id = idProp ?? genId;

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        {...rest}
        id={id}
        type={visible ? "text" : "password"}
        className={`${inputClassName} pr-10`}
        value={value}
      />
      <button
        type="button"
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideRevealLabel : showRevealLabel}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeOff className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        ) : (
          <Eye className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        )}
      </button>
    </div>
  );
}
