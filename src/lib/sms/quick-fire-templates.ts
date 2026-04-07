import { formatDispatcherPhoneForSms } from "@/lib/sms/hub-assignment-sms";

export const QUICK_FIRE_SMS_MAX_LEN = 159;

export type QuickFireTemplateType = "dispatch" | "cancelled" | "delayed";

/** Labels written to `loads.activity_log`. */
export const QUICK_FIRE_TEMPLATE_LOG_LABEL: Record<
  QuickFireTemplateType,
  string
> = {
  dispatch: "Dispatch (New Load)",
  cancelled: "Cancelled",
  delayed: "Delayed",
};

const DISPATCH_TEMPLATE =
  "NexusFreight: New Load assigned. PU: {{origin}} on {{date}}. DO: {{destination}}. Do not reply to this text. Call/Text {{dispatcher_phone}} to confirm.";

const CANCELLED_TEMPLATE =
  "NexusFreight ALERT: Load {{load_id}} CANCELLED. Do not proceed to pickup. Do not reply to this text. Call {{dispatcher_phone}} for new assignment.";

const DELAYED_TEMPLATE =
  "NexusFreight ALERT: PU Delayed for Load {{load_id}}. New window: {{new_time}}. Do not reply here. Call/Text {{dispatcher_phone}} for updates.";

function applyVars(template: string, vars: Record<string, string>): string {
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

export function shortLoadIdForSms(loadUuid: string): string {
  return loadUuid.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function buildDispatchBody(opts: {
  origin: string;
  destination: string;
  assignmentDate: Date;
  dispatcherRaw: string;
}): string {
  const dateStr = formatAssignmentDate(opts.assignmentDate);
  const build = (oMax: number, dMax: number, disp: string) =>
    applyVars(DISPATCH_TEMPLATE, {
      origin: cityFromLane(opts.origin, oMax),
      date: dateStr,
      destination: cityFromLane(opts.destination, dMax),
      dispatcher_phone: disp,
    });

  let oMax = 14;
  let dMax = 14;
  let disp = formatDispatcherPhoneForSms(opts.dispatcherRaw);

  for (let attempt = 0; attempt < 100; attempt++) {
    const text = build(oMax, dMax, disp);
    if (text.length < 160) return text;
    if (oMax > 6) {
      oMax--;
      continue;
    }
    if (dMax > 6) {
      dMax--;
      continue;
    }
    disp = "dispatch";
    const shorter = build(oMax, dMax, disp);
    if (shorter.length < 160) return shorter;
    if (oMax > 4) {
      oMax--;
      continue;
    }
    if (dMax > 4) {
      dMax--;
      continue;
    }
    break;
  }

  return build(4, 4, "dispatch").slice(0, QUICK_FIRE_SMS_MAX_LEN);
}

function buildCancelledBody(opts: {
  loadId: string;
  dispatcherRaw: string;
}): string {
  const lid = shortLoadIdForSms(opts.loadId);
  const build = (disp: string) =>
    applyVars(CANCELLED_TEMPLATE, {
      load_id: lid,
      dispatcher_phone: disp,
    });

  let disp = formatDispatcherPhoneForSms(opts.dispatcherRaw);
  for (let attempt = 0; attempt < 40; attempt++) {
    const text = build(disp);
    if (text.length < 160) return text;
    disp = "dispatch";
    const t2 = build(disp);
    if (t2.length < 160) return t2;
    break;
  }
  return build("dispatch").slice(0, QUICK_FIRE_SMS_MAX_LEN);
}

function clipText(s: string, maxChars: number): string {
  const t = s.trim() || "TBD";
  if (t.length <= maxChars) return t;
  if (maxChars < 2) return t.slice(0, 1);
  return `${t.slice(0, maxChars - 1)}…`;
}

function buildDelayedBody(opts: {
  loadId: string;
  newTime: string;
  dispatcherRaw: string;
}): string {
  const lid = shortLoadIdForSms(opts.loadId);
  const rawTime = opts.newTime.trim().length === 0 ? "TBD" : opts.newTime.trim();
  const build = (timeMax: number, disp: string) =>
    applyVars(DELAYED_TEMPLATE, {
      load_id: lid,
      new_time: clipText(rawTime, timeMax),
      dispatcher_phone: disp,
    });

  let tMax = 22;
  let disp = formatDispatcherPhoneForSms(opts.dispatcherRaw);

  for (let attempt = 0; attempt < 120; attempt++) {
    const text = build(tMax, disp);
    if (text.length < 160) return text;
    if (tMax > 4) {
      tMax--;
      continue;
    }
    disp = "dispatch";
    const shorter = build(tMax, disp);
    if (shorter.length < 160) return shorter;
    if (tMax > 3) {
      tMax--;
      continue;
    }
    break;
  }

  return build(3, "dispatch").slice(0, QUICK_FIRE_SMS_MAX_LEN);
}

/**
 * Plain-text SMS bodies for quick-fire alerts (target &lt; 160 characters).
 * `dispatcherRaw` is the resolved profile or `COMPANY_MAIN_PHONE` value.
 */
export function buildQuickFireSmsBody(
  type: QuickFireTemplateType,
  opts: {
    loadId: string;
    origin: string;
    destination: string;
    assignmentDate?: Date;
    /** Required when `type === "delayed"` */
    newTime?: string;
    dispatcherRaw: string;
  }
): string {
  switch (type) {
    case "dispatch":
      return buildDispatchBody({
        origin: opts.origin,
        destination: opts.destination,
        assignmentDate: opts.assignmentDate ?? new Date(),
        dispatcherRaw: opts.dispatcherRaw,
      });
    case "cancelled":
      return buildCancelledBody({
        loadId: opts.loadId,
        dispatcherRaw: opts.dispatcherRaw,
      });
    case "delayed":
      return buildDelayedBody({
        loadId: opts.loadId,
        newTime: opts.newTime?.trim() || "TBD",
        dispatcherRaw: opts.dispatcherRaw,
      });
  }
}

export function quickFireEmailSubject(
  type: QuickFireTemplateType
): string {
  switch (type) {
    case "dispatch":
      return "NF New Load";
    case "cancelled":
      return "NF Cancelled";
    case "delayed":
      return "NF Delayed";
  }
}
