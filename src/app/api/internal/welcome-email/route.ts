import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { send7DayTrialWelcomeEmail } from "@/lib/email/send-7day-trial-welcome";
import {
  foundingWelcomeResendConfigured,
  sendFoundingMemberWelcomeEmail,
} from "@/lib/email/send-founding-member-welcome";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type WelcomeBody = {
  userId?: string;
  email?: string;
  fullName?: string;
};

function timingSafeEqualStrings(a: string, b: string): boolean {
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return timingSafeEqual(ah, bh);
}

function verifyWebhookBearer(header: string | null): boolean {
  const secret = process.env.WELCOME_EMAIL_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const raw =
    header?.startsWith("Bearer ") && header.length > 7
      ? header.slice(7).trim()
      : "";
  if (!raw || raw.length !== secret.length) {
    return timingSafeEqualStrings(raw, secret);
  }
  return timingSafeEqual(Buffer.from(raw), Buffer.from(secret));
}

/**
 * Invoked by Postgres (pg_net) when a founding (BETA) or 7-day trial profile is inserted.
 * Configure `private.welcome_webhook_config` in Supabase — see migrations 00035 / 00036.
 */
export async function POST(req: Request) {
  if (!verifyWebhookBearer(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!foundingWelcomeResendConfigured()) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured." },
      { status: 503 }
    );
  }

  let body: WelcomeBody;
  try {
    body = (await req.json()) as WelcomeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const emailFromPayload = body.email?.trim().toLowerCase();
  const fullName = body.fullName?.trim() ?? "";

  if (!userId || !emailFromPayload) {
    return NextResponse.json(
      { error: "userId and email are required." },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service role is not configured." },
      { status: 503 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("welcome_email_sent_at, is_beta_user, trial_type, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("[welcome-email] profile load:", profileError.message);
    return NextResponse.json(
      { error: "Could not load profile." },
      { status: 500 }
    );
  }

  const sendFounding = profile?.is_beta_user === true;
  const sendTrial = profile?.trial_type === "TRIAL";

  if (!profile || (!sendFounding && !sendTrial)) {
    return NextResponse.json({ ok: true, skipped: "no_welcome_template" });
  }

  if (profile.welcome_email_sent_at) {
    return NextResponse.json({ ok: true, skipped: "already_sent" });
  }

  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(userId);

  if (userError || !userData?.user?.email) {
    console.error("[welcome-email] auth admin:", userError?.message);
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const canonicalEmail = userData.user.email.trim().toLowerCase();
  if (canonicalEmail !== emailFromPayload) {
    return NextResponse.json({ error: "Email mismatch." }, { status: 403 });
  }

  const displayName =
    (profile.full_name && profile.full_name.trim()) ||
    fullName ||
    canonicalEmail.split("@")[0] ||
    "there";

  const to = userData.user.email.trim();

  try {
    if (sendFounding) {
      await sendFoundingMemberWelcomeEmail({ to, displayName });
    } else {
      await send7DayTrialWelcomeEmail({ to, displayName });
    }
  } catch (e) {
    console.error("[welcome-email] Resend:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed." },
      { status: 502 }
    );
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", userId)
    .is("welcome_email_sent_at", null);

  if (updateError) {
    console.error("[welcome-email] profile update:", updateError.message);
    return NextResponse.json(
      { error: "Sent email but could not record delivery." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    template: sendFounding ? "founding" : "trial_7d",
  });
}
