import { NextResponse } from "next/server";
import twilio from "twilio";
import { resendDriverSmsConfigured } from "@/lib/email/resend-driver-sms";
import { sendDriverPlaintextSms } from "@/lib/sms/send-driver-plaintext-sms";
import { resolveDispatcherPhoneNumber } from "@/lib/sms/dispatcher-phone";
import { buildHubAssignmentSmsBody } from "@/lib/sms/hub-assignment-sms";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let body: {
    loadId?: string;
    driverPhone?: string;
    origin?: string;
    destination?: string;
    rateCents?: number;
    phoneCarrierDomain?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { loadId, driverPhone, origin, destination, rateCents } = body;
  if (!loadId || !driverPhone || !origin || !destination) {
    return NextResponse.json(
      { error: "loadId, driverPhone, origin, and destination are required." },
      { status: 400 }
    );
  }

  const domain =
    typeof body.phoneCarrierDomain === "string"
      ? body.phoneCarrierDomain.trim()
      : "";

  if (domain) {
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
      return NextResponse.json(
        {
          error:
            "Sign in required. Dispatcher phone for {{dispatcher_phone}} is loaded from your profile.",
        },
        { status: 401 }
      );
    }
    const { data: profileRow } = await userClient
      .from("profiles")
      .select("phone_number, phone, full_name")
      .eq("id", user.id)
      .maybeSingle();
    const prof = profileRow as {
      phone_number?: string | null;
      phone?: string | null;
      full_name?: string | null;
    } | null;
    const dispatcherPhoneNumber = prof
      ? resolveDispatcherPhoneNumber(prof)
      : null;

    if (!dispatcherPhoneNumber) {
      return NextResponse.json(
        {
          error:
            "Add your dispatcher phone in Settings or set COMPANY_MAIN_PHONE for the main business line ({{dispatcher_phone}}).",
        },
        { status: 400 }
      );
    }

    if (!resendDriverSmsConfigured()) {
      return NextResponse.json(
        {
          error:
            "Resend is not configured (RESEND_API_KEY). Required for email-to-SMS dispatch.",
        },
        { status: 503 }
      );
    }
    const text = buildHubAssignmentSmsBody({
      origin,
      destination,
      assignmentDate: new Date(),
      dispatcherPhoneNumber,
    });
    try {
      await sendDriverPlaintextSms({
        driverPhone,
        phoneCarrierDomain: domain,
        subject: "NF Hub",
        text,
        dispatcherFullName: prof?.full_name,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Email send failed";
      if (
        /invalid|required/i.test(message) &&
        /phone|carrier|domain/i.test(message)
      ) {
        return NextResponse.json(
          { error: "Invalid phone number or carrier domain for SMS email." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, channel: "email_sms" as const });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    return NextResponse.json(
      {
        error:
          "Twilio is not configured, and no wireless carrier was provided for email-to-SMS. Set TWILIO_* or save the driver’s carrier (e.g. Verizon → vtext.com).",
      },
      { status: 503 }
    );
  }

  const rate =
    typeof rateCents === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(rateCents / 100)
      : "—";

  const trackUrl = `${baseUrl.replace(/\/$/, "")}/track/${loadId}`;
  const text = [
    `NexusFreight dispatch: ${origin} → ${destination}.`,
    `Rate: ${rate}.`,
    `Track: ${trackUrl}`,
  ].join(" ");

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
