/** Minimum digits for a usable dispatcher callback number (US-style). */
export function countPhoneDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

export function isDispatcherPhoneProvided(value: string): boolean {
  return countPhoneDigits(value) >= 10;
}
