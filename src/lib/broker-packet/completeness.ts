import type { BrokerDocCategory } from "@/lib/broker-packet/categories";
import {
  BROKER_DOC_CATEGORIES,
  BROKER_SEND_REQUIRED,
} from "@/lib/broker-packet/categories";

export function completenessPercent(present: Set<BrokerDocCategory>): number {
  const n = BROKER_DOC_CATEGORIES.length;
  if (n === 0) return 0;
  let c = 0;
  for (const cat of BROKER_DOC_CATEGORIES) {
    if (present.has(cat)) c += 1;
  }
  return Math.round((c / n) * 100);
}

export function canSendToBroker(present: Set<BrokerDocCategory>): boolean {
  return BROKER_SEND_REQUIRED.every((c) => present.has(c));
}
