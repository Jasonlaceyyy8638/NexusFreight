export type BrokerDocCategory =
  | "operating_authority"
  | "w9"
  | "coi"
  | "safety_sms"
  | "carrier_profile"
  | "voided_check"
  | "notice_of_assignment";

export const BROKER_DOC_CATEGORIES: readonly BrokerDocCategory[] = [
  "operating_authority",
  "w9",
  "coi",
  "safety_sms",
  "carrier_profile",
  "voided_check",
  "notice_of_assignment",
] as const;

export const BROKER_DOC_LABELS: Record<BrokerDocCategory, string> = {
  operating_authority: "Operating Authority (MC/DOT Letter)",
  w9: "W-9 (Signed & Recent)",
  coi: "Certificate of Insurance (COI)",
  safety_sms: "Safety Rating / SMS Report",
  carrier_profile: "Carrier Profile / Fact Sheet",
  voided_check: "Voided Check (QuickPay / Direct Deposit)",
  notice_of_assignment: "Notice of Assignment (Factoring)",
};

/** Categories required before “Send to Broker” is enabled. */
export const BROKER_SEND_REQUIRED: readonly BrokerDocCategory[] = [
  "w9",
  "coi",
];

export function isBrokerDocCategory(s: string): s is BrokerDocCategory {
  return (BROKER_DOC_CATEGORIES as readonly string[]).includes(s);
}
