import { NextResponse } from "next/server";
import { isEldInviteTokenShape } from "@/lib/eld/invite-token";
import { buildMotiveAuthorizeUrl } from "@/lib/integrations/motive-oauth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function redirectTo(req: Request, path: string): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return `${env}${path.startsWith("/") ? path : `/${path}`}`;
  return new URL(path, req.url).toString();
}

export async function GET(req: Request) {
  const invite =
    new URL(req.url).searchParams.get("invite")?.trim() ?? "";

  if (!invite || !isEldInviteTokenShape(invite)) {
    return NextResponse.redirect(redirectTo(req, "/auth/signup"));
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.redirect(
      redirectTo(req, `/connect-eld/${invite}?motive_error=server`)
    );
  }

  const { data: inv } = await admin
    .from("eld_connect_invites")
    .select("id, expires_at, completed_at")
    .eq("id", invite)
    .maybeSingle();

  const row = inv as
    | { expires_at: string; completed_at: string | null }
    | null;
  if (
    !row ||
    row.completed_at != null ||
    new Date(row.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.redirect(redirectTo(req, `/connect-eld/${invite}`));
  }

  const url = buildMotiveAuthorizeUrl(invite);
  if (!url) {
    return NextResponse.redirect(
      redirectTo(req, `/connect-eld/${invite}?motive_error=config`)
    );
  }

  return NextResponse.redirect(url);
}
