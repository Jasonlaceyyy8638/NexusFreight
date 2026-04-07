import { NextResponse } from "next/server";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import {
  sendAccountCanceledEmail,
  sendCreditAddedEmail,
  sendRefundProcessedEmail,
} from "@/lib/email/admin-customer-notify";

export const runtime = "nodejs";

type Body = {
  type?: "refund" | "credit" | "account_canceled";
  toEmail?: string;
  amountUsd?: string;
};

/**
 * Internal: resend branded customer emails (admin session required).
 */
export async function POST(req: Request) {
  const adminUser = await getAdminUserOrNull();
  if (!adminUser) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const to = body.toEmail?.trim();
  if (!to || !body.type) {
    return NextResponse.json(
      { error: "toEmail and type required." },
      { status: 400 }
    );
  }

  try {
    switch (body.type) {
      case "refund":
        await sendRefundProcessedEmail(to);
        break;
      case "credit": {
        const amt = body.amountUsd?.trim() || "0.00";
        await sendCreditAddedEmail(to, amt);
        break;
      }
      case "account_canceled":
        await sendAccountCanceledEmail(to);
        break;
      default:
        return NextResponse.json({ error: "Invalid type." }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
