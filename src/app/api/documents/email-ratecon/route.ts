import { NextResponse } from "next/server";
import { sendEmailWithAttachment, sendgridConfigured } from "@/lib/email/sendgrid-send";

export const runtime = "nodejs";

type Body = {
  to?: string;
  subject?: string;
  bodyText?: string;
  /** Base64 file content (no data: prefix) */
  fileBase64?: string;
  filename?: string;
};

export async function POST(req: Request) {
  if (!sendgridConfigured()) {
    return NextResponse.json(
      { error: "SendGrid is not configured (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL)." },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Valid recipient email is required." }, { status: 400 });
  }

  const fileBase64 = typeof body.fileBase64 === "string" ? body.fileBase64.trim() : "";
  if (!fileBase64) {
    return NextResponse.json({ error: "fileBase64 is required." }, { status: 400 });
  }

  const filename =
    typeof body.filename === "string" && body.filename.trim()
      ? body.filename.trim().replace(/[/\\]/g, "-")
      : "rate-confirmation.pdf";

  const subject =
    typeof body.subject === "string" && body.subject.trim()
      ? body.subject.trim()
      : "Rate confirmation";

  const text =
    typeof body.bodyText === "string" && body.bodyText.trim()
      ? body.bodyText.trim()
      : "Please find your rate confirmation attached.\n\n— NexusFreight";

  try {
    await sendEmailWithAttachment({
      to,
      subject,
      text,
      attachment: {
        filename,
        contentBase64: fileBase64,
        mimeType: "application/pdf",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
