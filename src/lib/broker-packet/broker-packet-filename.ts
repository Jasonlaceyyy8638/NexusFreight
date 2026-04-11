/** Safe single segment for filenames (no path chars). */
export function sanitizeBrokerPacketSegment(raw: string, maxLen: number): string {
  const s = raw
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const t = s.length ? s : "Carrier";
  return t.slice(0, maxLen);
}

/**
 * Broker-facing download name: CarrierName_MC123456_Broker_Packet_YYYY-MM-DD.pdf
 * (ASCII-only; MC digits or "NA" when missing.)
 */
export function brokerPacketPdfFilename(
  carrierName: string,
  mcNumber: string | null | undefined,
  date = new Date()
): string {
  const namePart = sanitizeBrokerPacketSegment(carrierName.trim() || "Carrier", 48);
  const mcDigits = (mcNumber ?? "").replace(/\D/g, "");
  const mcPart = mcDigits.length ? mcDigits : "NA";
  const d = date.toISOString().slice(0, 10);
  return `${namePart}_MC${mcPart}_Broker_Packet_${d}.pdf`;
}
