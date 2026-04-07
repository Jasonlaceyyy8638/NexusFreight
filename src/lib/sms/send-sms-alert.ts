import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDriverRosterStatus } from "@/lib/driver-roster-status";
import { sendDriverPlaintextSms } from "@/lib/sms/send-driver-plaintext-sms";

/**
 * Loads the driver row, validates roster + phone, then sends plain text via
 * Resend → carrier email gateway (e.g. 9375551234@vtext.com) or Twilio.
 *
 * Gateway domains are defined in `src/constants/carriers.ts` (`US_WIRELESS_CARRIERS`).
 */
export async function sendSmsAlert(
  supabase: SupabaseClient,
  driverId: string,
  message: {
    subject: string;
    text: string;
    dispatcherFullName: string | null | undefined;
  }
): Promise<{ channel: "email_sms" | "twilio" }> {
  const { data: driverRow, error: driverErr } = await supabase
    .from("drivers")
    .select("phone, phone_carrier, status")
    .eq("id", driverId)
    .maybeSingle();

  if (driverErr) {
    throw new Error(driverErr.message);
  }
  if (!driverRow) {
    throw new Error("Driver not found.");
  }

  const driver = driverRow as {
    phone: string | null;
    phone_carrier: string | null;
    status: string;
  };

  if (normalizeDriverRosterStatus(driver.status) !== "active") {
    throw new Error(
      "Driver must be Active on the roster to receive SMS alerts."
    );
  }

  const driverPhone = driver.phone?.trim();
  if (!driverPhone) {
    throw new Error("Driver needs a phone number on file.");
  }

  return sendDriverPlaintextSms({
    driverPhone,
    phoneCarrierDomain: driver.phone_carrier,
    subject: message.subject,
    text: message.text,
    dispatcherFullName: message.dispatcherFullName,
  });
}
