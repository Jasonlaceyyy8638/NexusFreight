import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrokerDocCategory } from "@/lib/broker-packet/categories";
import { canSendToBroker } from "@/lib/broker-packet/completeness";
import { brokerPacketPdfFilename } from "@/lib/broker-packet/broker-packet-filename";
import { getDispatcherContactForBrokerPacket } from "@/lib/broker-packet/dispatcher-contact";
import { prepareBrokerPacketStitchInputs } from "@/lib/broker-packet/prepare-stitch-inputs";
import { stitchBrokerPacketPdf } from "@/lib/broker-packet/stitch-pdf";
import { getCarrierIfMember } from "@/lib/broker-packet/verify-access";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export function brokerPacketResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Verified-domain sender; override with BROKER_PACKET_FROM or RESEND_FROM_BROKER_PACKET. */
export function brokerPacketFromAddress(): string {
  const raw =
    process.env.BROKER_PACKET_FROM?.trim() ||
    process.env.RESEND_FROM_BROKER_PACKET?.trim();
  if (raw) return raw;
  return "NexusFreight <info@nexusfreight.tech>";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Professional Broker Email Template (marketing copy; keep in sync with plain-text). */
function buildEmailHtml(params: {
  carrierName: string;
  mcDisplay: string;
  dispatcherName: string;
  dispatcherEmail: string;
  includeNoticeOfAssignment: boolean;
}): string {
  const carrier = escapeHtml(params.carrierName);
  const mc = escapeHtml(params.mcDisplay);
  const dName = escapeHtml(params.dispatcherName);
  const dEmail = escapeHtml(params.dispatcherEmail);
  const contactLine =
    params.dispatcherEmail && params.dispatcherEmail !== "—"
      ? `${dName} (<a href="mailto:${encodeURIComponent(params.dispatcherEmail)}" style="color:#0b57d0;">${dEmail}</a>)`
      : `${dName} (${dEmail})`;
  const noaLine = params.includeNoticeOfAssignment
    ? `<li style="margin:0 0 6px;">Notice of Assignment</li>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e6eb;border-radius:8px;">
          <tr>
            <td style="padding:32px 32px 24px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#1f2937;">
              <p style="margin:0 0 18px;">Attention Carrier Relations / Onboarding Department,</p>
              <p style="margin:0 0 18px;">Please find the attached Broker Setup Packet for <strong>${carrier}</strong>.</p>
              <p style="margin:0 0 14px;">This document has been compiled and verified through the NexusFreight Compliance Engine and includes the following required credentials:</p>
              <ul style="margin:0 0 18px;padding-left:22px;">
                <li style="margin:0 0 6px;">Operating Authority (MC/DOT Letter)</li>
                <li style="margin:0 0 6px;">Certificate of Insurance (COI)</li>
                <li style="margin:0 0 6px;">Signed W-9 Form</li>
                <li style="margin:0 0 6px;">Payment Instructions / Voided Check</li>
                ${noaLine}
              </ul>
              ${params.includeNoticeOfAssignment ? "" : `<p style="margin:0 0 18px;font-size:13px;color:#6b7280;">[Optional: Notice of Assignment]</p>`}
              <p style="margin:0 0 8px;"><strong>Compliance Status:</strong> Verified Active</p>
              <p style="margin:0 0 8px;"><strong>Carrier MC#:</strong> ${mc}</p>
              <p style="margin:0 0 22px;"><strong>Dispatcher Contact:</strong> ${contactLine}</p>
              <p style="margin:0 0 28px;">Please let us know if any additional information is required to complete the setup process.</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">NexusFreight Logistics Infrastructure</p>
              <p style="margin:6px 0 0;font-size:13px;letter-spacing:0.06em;color:#4b5563;">Digital. Direct. Driven.</p>
              <p style="margin:10px 0 0;"><a href="https://nexusfreight.tech" style="color:#0b57d0;font-size:14px;">https://nexusfreight.tech</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText(params: {
  carrierName: string;
  mcDisplay: string;
  dispatcherName: string;
  dispatcherEmail: string;
  includeNoticeOfAssignment: boolean;
}): string {
  const lines = [
    "Attention Carrier Relations / Onboarding Department,",
    "",
    `Please find the attached Broker Setup Packet for ${params.carrierName}.`,
    "",
    "This document has been compiled and verified through the NexusFreight Compliance Engine and includes the following required credentials:",
    "",
    "Operating Authority (MC/DOT Letter)",
    "Certificate of Insurance (COI)",
    "Signed W-9 Form",
    "Payment Instructions / Voided Check",
  ];
  if (params.includeNoticeOfAssignment) {
    lines.push("Notice of Assignment");
  } else {
    lines.push("[Optional: Notice of Assignment]");
  }
  lines.push(
    "",
    "Compliance Status: Verified Active",
    `Carrier MC#: ${params.mcDisplay}`,
    `Dispatcher Contact: ${params.dispatcherName} (${params.dispatcherEmail})`,
    "",
    "Please let us know if any additional information is required to complete the setup process.",
    "",
    "NexusFreight Logistics Infrastructure",
    "Digital. Direct. Driven.",
    "https://nexusfreight.tech"
  );
  return lines.join("\n");
}

export type SendBrokerPacketResult =
  | { ok: true }
  | { error: string; status: number };

/**
 * Stitches carrier_documents from storage into one PDF and emails via Resend.
 */
export async function sendBrokerPacketToBroker(
  supabase: SupabaseClient,
  userId: string,
  carrierId: string,
  to: string
): Promise<SendBrokerPacketResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { error: "Email not configured (RESEND_API_KEY).", status: 503 };
  }

  const access = await getCarrierIfMember(supabase, userId, carrierId);
  if (!access) {
    return { error: "Not found.", status: 404 };
  }

  const { data: rows, error } = await supabase
    .from("carrier_documents")
    .select("doc_category, storage_path, original_filename")
    .eq("carrier_id", carrierId);

  if (error) {
    return { error: error.message, status: 500 };
  }

  const present = new Set(
    (rows ?? []).map((r) => (r as { doc_category: BrokerDocCategory }).doc_category)
  );
  if (!canSendToBroker(present)) {
    return {
      error:
        "Missing required documents (operating authority, W-9, and COI).",
      status: 400,
    };
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return { error: "Service role not configured.", status: 503 };
  }

  const rowList = (rows ?? []) as {
    doc_category: BrokerDocCategory;
    storage_path: string;
    original_filename: string | null;
  }[];

  const inputs = await prepareBrokerPacketStitchInputs(admin, rowList);

  const dispatcher = await getDispatcherContactForBrokerPacket(supabase, userId);
  const cover = {
    carrierName: access.name,
    mcNumber: access.mc_number,
    dotNumber: access.dot_number,
    dispatcherName: dispatcher.name,
    dispatcherPhone: dispatcher.phone,
    dispatcherEmail: dispatcher.email,
  };

  const pdfBytes = await stitchBrokerPacketPdf(inputs, cover);
  const attachName = brokerPacketPdfFilename(access.name, access.mc_number);
  const mcDisplay = access.mc_number?.trim() || "N/A";
  const subject = `Carrier Setup Packet: ${access.name} (MC# ${mcDisplay})`;
  const includeNoticeOfAssignment = present.has("notice_of_assignment");

  const templateBody = {
    carrierName: access.name,
    mcDisplay,
    dispatcherName: dispatcher.name,
    dispatcherEmail: dispatcher.email,
    includeNoticeOfAssignment,
  };

  const resend = new Resend(apiKey);
  const { error: sendErr } = await resend.emails.send({
    from: brokerPacketFromAddress(),
    to,
    subject,
    text: buildEmailText(templateBody),
    html: buildEmailHtml(templateBody),
    attachments: [
      {
        filename: attachName,
        content: Buffer.from(pdfBytes),
      },
    ],
  });

  if (sendErr) {
    return { error: sendErr.message, status: 502 };
  }

  return { ok: true };
}
