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

/** First missing category for packet download / stitch, in canonical order. */
export function firstMissingBrokerPacketForDownload(
  present: Set<BrokerDocCategory>
): BrokerDocCategory | null {
  for (const c of BROKER_SEND_REQUIRED) {
    if (!present.has(c)) return c;
  }
  return null;
}

export function brokerPacketDownloadBlockedMessage(
  missing: BrokerDocCategory
): string {
  switch (missing) {
    case "coi":
      return "Wait! You need to upload the Insurance Certificate before generating a packet.";
    case "w9":
      return "Wait! You need to upload your W-9 before generating a packet.";
    case "operating_authority":
      return "Wait! You need to upload your Operating Authority (MC/DOT letter) before generating a packet.";
    default:
      return "Wait! You need to upload all required documents before generating a packet.";
  }
}
