import { NextResponse } from "next/server";
import twilio from "twilio";
import { sendTransactionalEmail, sendgridConfigured } from "@/lib/email/sendgrid-send";
import {
  resendDriverSmsConfigured,
  sendDriverSmsEmailViaResend,
} from "@/lib/email/resend-driver-sms";
import { resolveDispatcherPhoneNumber } from "@/lib/sms/dispatcher-phone";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { normalizeDriverRosterStatus } from "@/lib/driver-roster-status";

export const runtime = "nodejs";

/**
 * After a load is assigned to a driver, notify them via SMS (Twilio or email-to-SMS)
 * or plain email (SendGrid) so the mobile app user gets the handoff.
 */
export async function POST(req: Request) {
  let body: { loadId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const loadId = typeof body.loadId === "string" ? body.loadId.trim() : "";
  if (!loadId) {
    return NextResponse.json({ error: "loadId is required." }, { status: 400 });
  }

  const userClient = await createServerSupabaseClient();
  if (!userClient) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("org_id, full_name, phone_number, phone")
    .eq("id", user.id)
    .maybeSingle();
  const orgId = (profile as { org_id?: string } | null)?.org_id;
  if (!orgId) {
    return NextResponse.json({ error: "Profile not found." }, { status: 403 });
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 503 }
    );
  }

  const { data: load, error: loadErr } = await svc
    .from("loads")
    .select("id, org_id, origin, destination, rate_cents, driver_id, carrier_id")
    .eq("id", loadId)
    .maybeSingle();

  if (loadErr || !load) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }

  if (load.org_id !== orgId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!load.driver_id) {
    return NextResponse.json(
      { error: "Load has no driver assigned." },
      { status: 400 }
    );
  }

  const { data: driver, error: dErr } = await svc
    .from("drivers")
    .select(
      "id, phone, phone_carrier, contact_email, full_name, status"
    )
    .eq("id", load.driver_id)
    .maybeSingle();

  if (dErr || !driver) {
    return NextResponse.json({ error: "Driver not found." }, { status: 404 });
  }

  if (normalizeDriverRosterStatus(driver.status as string) !== "active") {
    return NextResponse.json(
      { error: "Driver roster status must be active." },
      { status: 400 }
    );
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const trackUrl = `${baseUrl}/track/${loadId}`;
  const rate =
    typeof load.rate_cents === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(load.rate_cents / 100)
      : "—";

  const text = [
    `NexusFreight dispatch: ${load.origin} → ${load.destination}.`,
    `Rate: ${rate}.`,
    `Track: ${trackUrl}`,
  ].join(" ");

  const prof = profile as {
    phone_number?: string | null;
    phone?: string | null;
    full_name?: string | null;
  } | null;
  const dispatcherPhoneNumber = prof
    ? resolveDispatcherPhoneNumber(prof)
    : null;

  const driverPhone = (driver.phone ?? "").trim();
  const domain = (driver.phone_carrier ?? "").trim();
  const contactEmail = (driver.contact_email ?? "").trim();

  if (driverPhone && domain) {
    if (!resendDriverSmsConfigured()) {
      return NextResponse.json(
        {
          error:
            "RESEND_API_KEY is not configured; cannot send email-to-SMS to this driver.",
        },
        { status: 503 }
      );
    }
    if (!dispatcherPhoneNumber) {
      return NextResponse.json(
        {
          error:
            "Add your dispatcher phone in Settings so email-to-SMS can include a callback number.",
        },
        { status: 400 }
      );
    }
    try {
      await sendDriverSmsEmailViaResend({
        to: `${driverPhone}@${domain}`,
        subject: "NF Hub",
        text,
        dispatcherFullName: prof?.full_name,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Email send failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, channel: "email_sms" as const });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (driverPhone && sid && token && from) {
    const client = twilio(sid, token);
    try {
      await client.messages.create({
        from,
        to: driverPhone,
        body: text,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Twilio error";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, channel: "twilio" as const });
  }

  if (contactEmail && sendgridConfigured()) {
    try {
      await sendTransactionalEmail({
        to: contactEmail,
        subject: `New load assigned: ${load.origin} → ${load.destination}`,
        text: [
          `Hi ${driver.full_name},`,
          ``,
          `You have a new assigned load.`,
          ``,
          `Lane: ${load.origin} → ${load.destination}`,
          `Rate: ${rate}`,
          `Track: ${trackUrl}`,
          ``,
          `Open the NexusFreight driver app for full details.`,
        ].join("\n"),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Email send failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, channel: "email" as const });
  }

  return NextResponse.json(
    {
      error:
        "No notification channel: add driver mobile + wireless domain, SMS-capable phone with Twilio, or contact email with SendGrid configured.",
    },
    { status: 400 }
  );
}
