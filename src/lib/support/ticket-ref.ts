/** Short ticket reference for display and email subjects (first 8 hex chars of UUID). */
export function ticketPublicRef(ticketId: string): string {
  return ticketId.replace(/-/g, "").slice(0, 8).toUpperCase();
}
