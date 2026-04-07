/**
 * Build carrier email-to-SMS address: digits only + @ + gateway host.
 * @param carrierDomain e.g. "vtext.com" or "@vtext.com"
 */
export function getSmsEmailAddress(
  phoneNumber: string,
  carrierDomain: string
): string {
  const digits = phoneNumber.replace(/\D/g, "");
  const host = carrierDomain.trim().replace(/^@+/, "");
  if (!digits || !host) {
    throw new Error("Phone number and carrier domain are required.");
  }
  return `${digits}@${host}`;
}
