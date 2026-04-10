import { NextResponse } from "next/server";
import { verifyAnnouncementUnsubscribe } from "@/lib/admin/announcement-unsubscribe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * One-click unsubscribe from product announcement emails (signed token).
 * GET /api/unsubscribe/announcements?t=...
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("preview") === "1") {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;"><p>This is a preview link. Live emails contain a unique unsubscribe link.</p></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const token = url.searchParams.get("t")?.trim();
  if (!token) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;"><p>Invalid unsubscribe link.</p></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const verified = verifyAnnouncementUnsubscribe(token);
  if (!verified) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;"><p>This unsubscribe link is invalid or has expired.</p></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;"><p>Service unavailable. Try again later.</p></body></html>`,
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const { error } = await svc
    .from("profiles")
    .update({ announcement_emails_opt_out: true })
    .eq("id", verified.profileId);

  if (error) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;"><p>Could not update preferences: ${escapeHtmlAttr(error.message)}</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head><body style="font-family:system-ui,sans-serif;padding:32px;max-width:520px;margin:0 auto;line-height:1.5;">
<h1 style="font-size:1.25rem;">You&apos;re unsubscribed</h1>
<p>You will no longer receive product update emails from NexusFreight at this account. You can contact support if this was a mistake.</p>
<p style="margin-top:24px;"><a href="https://nexusfreight.tech">nexusfreight.tech</a></p>
</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}
