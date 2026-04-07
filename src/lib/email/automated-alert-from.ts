/** Mailbox for automated driver email-to-SMS (no Reply-To). */
export const AUTOMATED_ALERT_MAILBOX = "alerts@nexusfreight.tech";

/**
 * `From` header: `"[Dispatcher Name] | NexusFreight" <alerts@nexusfreight.tech>`
 * Display name is quoted for RFC 5322 safety. Falls back to `Dispatch` if name is empty.
 */
export function formatAutomatedAlertFromHeader(
  dispatcherFullName: string | null | undefined
): string {
  const raw = dispatcherFullName?.trim();
  const label = raw && raw.length > 0 ? raw : "Dispatch";
  const sanitized = label.replace(/[\r\n]/g, " ").replace(/\s+/g, " ").trim();
  const display = `${sanitized} | NexusFreight`;
  const escaped = display.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}" <${AUTOMATED_ALERT_MAILBOX}>`;
}
