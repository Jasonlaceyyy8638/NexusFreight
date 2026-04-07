/**
 * Plain-text body for carrier email-to-SMS gateways.
 * Must stay strictly under 160 characters (single-segment SMS).
 *
 * Template uses {{dispatcher_phone}} (and other {{...}} vars) — never hardcode a number;
 * the server substitutes from profiles.phone_number (fallback: profiles.phone).
 */
export const HUB_ASSIGNMENT_SMS_MAX_LEN = 159;

/** Placeholder token in HUB_ASSIGNMENT_SMS_TEMPLATE for the logged-in dispatcher. */
export const DISPATCHER_PHONE_PLACEHOLDER = "{{dispatcher_phone}}";

/**
 * Full template before substitution. `{{dispatcher_phone}}` is replaced with the
 * dispatcher’s formatted number from the database (or "dispatch" if unset).
 */
export const HUB_ASSIGNMENT_SMS_TEMPLATE =
  "NexusFreight: New Load assigned. PU: {{pickup_city}} on {{assignment_date}}. DO: {{delivery_city}}. Do not reply to this text. Call/Text {{dispatcher_phone}} to confirm.";

function applyTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

function cityFromLane(lane: string, maxChars: number): string {
  const t = lane.trim();
  if (!t) return "?";
  const first = t.split(",")[0]?.trim() || t;
  if (first.length <= maxChars) return first;
  if (maxChars < 2) return first.slice(0, 1);
  return `${first.slice(0, maxChars - 1)}…`;
}

function formatAssignmentDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Compact display for SMS; use as {{dispatcher_phone}} value when set. */
export function formatDispatcherPhoneForSms(
  phoneNumber: string | null | undefined
): string {
  const raw = phoneNumber?.trim();
  if (!raw) return "dispatch";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const n = digits.slice(1);
    return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw.length > 14 ? `${raw.slice(0, 13)}…` : raw;
}

/**
 * Builds the final SMS body from HUB_ASSIGNMENT_SMS_TEMPLATE (all placeholders replaced).
 * `dispatcherPhoneNumber` should come from the authenticated user’s profile.phone_number (or phone).
 */
export function buildHubAssignmentSmsBody(opts: {
  origin: string;
  destination: string;
  assignmentDate?: Date;
  /** Raw value from profiles.phone_number or profiles.phone — never a hardcoded number. */
  dispatcherPhoneNumber?: string | null;
}): string {
  const dateStr = formatAssignmentDate(opts.assignmentDate ?? new Date());
  const dispatcherDisplay = formatDispatcherPhoneForSms(
    opts.dispatcherPhoneNumber
  );

  const build = (puMax: number, doMax: number, disp: string) => {
    const pu = cityFromLane(opts.origin, puMax);
    const dest = cityFromLane(opts.destination, doMax);
    return applyTemplate(HUB_ASSIGNMENT_SMS_TEMPLATE, {
      pickup_city: pu,
      assignment_date: dateStr,
      delivery_city: dest,
      dispatcher_phone: disp,
    });
  };

  let puMax = 16;
  let doMax = 16;
  let disp = dispatcherDisplay;

  for (let attempt = 0; attempt < 80; attempt++) {
    const body = build(puMax, doMax, disp);
    if (body.length < 160) return body;
    if (puMax > 8) {
      puMax--;
      continue;
    }
    if (doMax > 8) {
      doMax--;
      continue;
    }
    disp = "dispatch";
    const shortBody = build(puMax, doMax, disp);
    if (shortBody.length < 160) return shortBody;
    if (puMax > 4) {
      puMax--;
      continue;
    }
    if (doMax > 4) {
      doMax--;
      continue;
    }
    break;
  }

  return build(4, 4, "dispatch").slice(0, HUB_ASSIGNMENT_SMS_MAX_LEN);
}
