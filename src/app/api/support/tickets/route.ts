import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  sendSupportTicketInternalAlert,
  sendSupportTicketUserConfirmation,
  supportTicketEmailsConfigured,
} from "@/lib/email/support-ticket-emails";
import { ticketPublicRef } from "@/lib/support/ticket-ref";

export const runtime = "nodejs";

const MAX_SUBJECT = 200;
const MAX_DESCRIPTION = 10_000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const PRIORITIES = new Set(["Low", "Medium", "High"]);

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

function clip(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server is not configured." },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const subject = clip(String(form.get("subject") ?? ""), MAX_SUBJECT);
  const description = clip(String(form.get("description") ?? ""), MAX_DESCRIPTION);
  const priorityRaw = String(form.get("priority") ?? "Medium").trim();

  if (!subject || !description) {
    return NextResponse.json(
      { error: "Subject and description are required." },
      { status: 400 }
    );
  }

  const priority = PRIORITIES.has(priorityRaw) ? priorityRaw : "Medium";

  const file = form.get("screenshot");
  const screenshotFile =
    file instanceof File && file.size > 0 ? file : null;

  if (screenshotFile) {
    if (screenshotFile.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Screenshot must be 5 MB or smaller." },
        { status: 400 }
      );
    }
    const mime = screenshotFile.type || "application/octet-stream";
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        { error: "Screenshot must be JPG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }
  }

  const { data: ticket, error: insertError } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      subject,
      description,
      priority,
      status: "Open",
    })
    .select("id")
    .single();

  if (insertError || !ticket?.id) {
    console.error("[support/tickets] insert:", insertError?.message);
    return NextResponse.json(
      { error: "Could not create ticket." },
      { status: 500 }
    );
  }

  const ticketId = ticket.id as string;
  let screenshotPath: string | null = null;

  if (screenshotFile) {
    const mime = screenshotFile.type || "image/png";
    const ext = extFromMime(mime);
    const path = `${user.id}/${ticketId}.${ext}`;
    const buf = new Uint8Array(await screenshotFile.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from("support-tickets")
      .upload(path, buf, {
        contentType: mime,
        upsert: false,
      });

    if (upErr) {
      console.error("[support/tickets] upload:", upErr.message);
    } else {
      screenshotPath = path;
      const { error: patchErr } = await supabase
        .from("support_tickets")
        .update({ screenshot_url: path })
        .eq("id", ticketId)
        .eq("user_id", user.id);
      if (patchErr) {
        console.error("[support/tickets] patch screenshot:", patchErr.message);
      }
    }
  }

  let screenshotSignedUrl: string | null = null;
  if (screenshotPath) {
    const svc = createServiceRoleSupabaseClient();
    if (svc) {
      const { data: signed } = await svc.storage
        .from("support-tickets")
        .createSignedUrl(screenshotPath, 60 * 60 * 24 * 7);
      screenshotSignedUrl = signed?.signedUrl ?? null;
    }
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin;

  if (supportTicketEmailsConfigured()) {
    try {
      await sendSupportTicketUserConfirmation({
        to: user.email,
        ticketId,
      });
    } catch (e) {
      console.error("[support/tickets] user email:", e);
    }
    try {
      await sendSupportTicketInternalAlert({
        ticketId,
        userEmail: user.email,
        subject,
        description,
        priority,
        screenshotSignedUrl,
        dashboardUrl: `${baseUrl}/dashboard/support`,
      });
    } catch (e) {
      console.error("[support/tickets] internal email:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    id: ticketId,
    ref: ticketPublicRef(ticketId),
    screenshotUploaded: Boolean(screenshotPath),
  });
}
