import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * PKCE email links (invites, magic links) land here with `?code=...`.
 * Exchanges the code for a session cookie, then redirects to `next` (must be a same-origin path).
 *
 * Add to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
 *   https://<your-domain>/auth/callback
 *   http://localhost:3000/auth/callback   (dev)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const err = searchParams.get("error_description") ?? searchParams.get("error");
  const rawNext = searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/driver/dashboard";

  if (err) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(err)}`
    );
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent("Server configuration error.")}`
      );
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession:", error.message);
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
