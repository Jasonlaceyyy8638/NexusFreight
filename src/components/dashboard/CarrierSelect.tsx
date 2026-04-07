"use client";

import { US_WIRELESS_CARRIERS } from "@/constants/carriers";

type Props = {
  id?: string;
  value: string;
  onChange: (domain: string) => void;
  className?: string;
  disabled?: boolean;
  /** Shown as first option when empty string is allowed */
  placeholderLabel?: string;
};

/**
 * Wireless carrier gateway for email-to-SMS (`value` = host, e.g. `vtext.com`).
 */
export function CarrierSelect({
  id,
  value,
  onChange,
  className,
  disabled,
  placeholderLabel = "— Not set —",
}: Props) {
  return (
    <select
      id={id}
      className={className}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Wireless carrier for SMS gateway"
    >
      <option value="">{placeholderLabel}</option>
      {US_WIRELESS_CARRIERS.map((c) => (
        <option key={c.domain} value={c.domain}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
