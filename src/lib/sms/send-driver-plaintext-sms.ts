import twilio from "twilio";
import {
  resendDriverSmsConfigured,
  sendDriverSmsEmailViaResend,
} from "@/lib/email/resend-driver-sms";
import { getSmsEmailAddress } from "@/lib/sms/get-sms-email-address";

/**
 * Sends a single-segment plain-text message: email-to-SMS when `phoneCarrierDomain`
 * is set (see `src/constants/carriers.ts` gateway hosts), otherwise Twilio.
 * Email-to-SMS uses Resend (`RESEND_API_KEY`); `dispatcherFullName` shapes the From display name.
 */
export async function sendDriverPlaintextSms(opts: {
  driverPhone: string;
  phoneCarrierDomain: string | null | undefined;
  subject: string;
  text: string;
  /** Logged-in dispatcher `profiles.full_name` for the From header. */
  dispatcherFullName: string | null | undefined;
}): Promise<{ channel: "email_sms" | "twilio" }> {
  const domain = opts.phoneCarrierDomain?.trim() ?? "";
  const driverPhone = opts.driverPhone.trim();

  if (domain) {
    if (!resendDriverSmsConfigured()) {
      throw new Error(
        "Resend is not configured (RESEND_API_KEY). Required when the driver has a wireless carrier for email-to-SMS."
      );
    }
    const to = getSmsEmailAddress(driverPhone, domain);
    await sendDriverSmsEmailViaResend({
      to,
      subject: opts.subject,
      text: opts.text,
      dispatcherFullName: opts.dispatcherFullName,
    });
    return { channel: "email_sms" };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    throw new Error(
      "Twilio is not configured. Save the driver’s wireless carrier for email-to-SMS, or set TWILIO_*."
    );
  }

  const client = twilio(sid, token);
  await client.messages.create({
    from,
    to: driverPhone,
    body: opts.text,
  });
  return { channel: "twilio" };
}
