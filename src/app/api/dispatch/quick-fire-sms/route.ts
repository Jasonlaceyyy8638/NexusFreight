import { NextResponse } from "next/server";
import { resolveDispatcherPhoneNumber } from "@/lib/sms/dispatcher-phone";
import {
  buildQuickFireSmsBody,
  QUICK_FIRE_TEMPLATE_LOG_LABEL,
  quickFireEmailSubject,
  type QuickFireTemplateType,
} from "@/lib/sms/quick-fire-templates";
import { sendSmsAlert } from "@/lib/sms/send-sms-alert";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LoadActivityLogEntry } from "@/types/database";

export const runtime = "nodejs";

const TEMPLATE_TYPES: QuickFireTemplateType[] = [
  "dispatch",
  "cancelled",
  "delayed",
];

function parseTemplateType(raw: unknown): QuickFireTemplateType | null {
  if (typeof raw !== "string") return null;
  return TEMPLATE_TYPES.includes(raw as QuickFireTemplateType)
    ? (raw as QuickFireTemplateType)
    : null;
}

function parseActivityLog(raw: unknown): LoadActivityLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LoadActivityLogEntry[] = [];
  for (const e of raw) {
    if (
      e &&
      typeof e === "object" &&
      "at" in e &&
      "message" in e &&
      typeof (e as LoadActivityLogEntry).at === "string" &&
      typeof (e as LoadActivityLogEntry).message === "string"
    ) {
      out.push({
        at: (e as LoadActivityLogEntry).at,
        message: (e as LoadActivityLogEntry).message,
      });
    }
  }
  return out;
}

export async function POST(req: Request) {
  let body: {
    loadId?: string;
    templateType?: string;
    newTime?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const loadId = typeof body.loadId === "string" ? body.loadId.trim() : "";
  const templateType = parseTemplateType(body.templateType);
  const newTime =
    typeof body.newTime === "string" ? body.newTime.slice(0, 120) : undefined;

  if (!loadId || !templateType) {
    return NextResponse.json(
      {
        error:
          "loadId and templateType (dispatch, cancelled, or delayed) are required.",
      },
      { status: 400 }
    );
  }

  const userClient = await createServerSupabaseClient();
  if (!userClient) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: profileRow } = await userClient
    .from("profiles")
    .select("org_id, phone_number, phone, full_name")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as {
    org_id?: string;
    phone_number?: string | null;
    phone?: string | null;
    full_name?: string | null;
  } | null;
  if (!profile?.org_id) {
    return NextResponse.json({ error: "Profile not found." }, { status: 403 });
  }

  const dispatcherRaw = resolveDispatcherPhoneNumber(profile);
  if (!dispatcherRaw) {
    return NextResponse.json(
      {
        error:
          "Set your mobile number on your profile or configure COMPANY_MAIN_PHONE for the main business line ({{dispatcher_phone}}).",
      },
      { status: 400 }
    );
  }

  const { data: loadRow, error: loadErr } = await userClient
    .from("loads")
    .select("id, org_id, origin, destination, driver_id, activity_log")
    .eq("id", loadId)
    .maybeSingle();

  if (loadErr || !loadRow) {
    return NextResponse.json(
      { error: loadErr?.message ?? "Load not found." },
      { status: loadErr ? 500 : 404 }
    );
  }

  const load = loadRow as {
    org_id: string;
    origin: string;
    destination: string;
    driver_id: string | null;
    activity_log?: unknown;
  };

  if (load.org_id !== profile.org_id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!load.driver_id) {
    return NextResponse.json(
      { error: "Assign a driver before sending SMS alerts." },
      { status: 400 }
    );
  }

  const text = buildQuickFireSmsBody(templateType, {
    loadId,
    origin: load.origin,
    destination: load.destination,
    newTime,
    dispatcherRaw,
  });
  const subject = quickFireEmailSubject(templateType);

  let channel: "email_sms" | "twilio";
  try {
    const result = await sendSmsAlert(userClient, load.driver_id, {
      subject,
      text,
      dispatcherFullName: profile.full_name,
    });
    channel = result.channel;
  } catch (e) {
    const message = e instanceof Error ? e.message : "SMS send failed";
    const lower = message.toLowerCase();
    const status =
      lower.includes("not configured") ||
      lower.includes("twilio") ||
      lower.includes("resend")
        ? 503
        : lower.includes("not found") || lower.includes("must be active")
          ? 400
          : 502;
    return NextResponse.json({ error: message }, { status });
  }

  const sentAt = new Date();
  const logMessage = `${QUICK_FIRE_TEMPLATE_LOG_LABEL[templateType]} sent to driver at ${sentAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
  const prevLog = parseActivityLog(load.activity_log);
  const nextLog: LoadActivityLogEntry[] = [
    ...prevLog,
    { at: sentAt.toISOString(), message: logMessage },
  ];

  const { error: logErr } = await userClient
    .from("loads")
    .update({ activity_log: nextLog })
    .eq("id", loadId);

  if (logErr) {
    return NextResponse.json(
      {
        error: `SMS sent but activity log failed to save: ${logErr.message}`,
        ok: false,
        channel,
        templateType,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    channel,
    templateType,
    logEntry: nextLog[nextLog.length - 1],
  });
}
