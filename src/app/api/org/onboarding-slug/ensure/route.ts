import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function newSlug(): string {
  return randomBytes(8).toString("base64url").replace(/=/g, "").slice(0, 12).toLowerCase();
}

/**
 * Ensures the signed-in user's organization has a stable `onboarding_slug`
 * for public driver uploads. Agency workspaces only.
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();
  if (pErr || !profile?.org_id) {
    return NextResponse.json(
      { error: "No workspace linked to your profile." },
      { status: 400 }
    );
  }

  const orgId = profile.org_id as string;

  const { data: org, error: oErr } = await supabase
    .from("organizations")
    .select("id, type, onboarding_slug")
    .eq("id", orgId)
    .maybeSingle();
  if (oErr || !org) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }
  if ((org as { type: string }).type !== "Agency") {
    return NextResponse.json(
      { error: "Onboarding links are only available for agency (dispatcher) workspaces." },
      { status: 400 }
    );
  }

  const existing = (org as { onboarding_slug?: string | null }).onboarding_slug?.trim();
  if (existing) {
    return NextResponse.json({ slug: existing.toLowerCase() });
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role not configured." },
      { status: 503 }
    );
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    const slug = newSlug();
    const { data: updated, error: uErr } = await admin
      .from("organizations")
      .update({ onboarding_slug: slug })
      .eq("id", orgId)
      .is("onboarding_slug", null)
      .select("onboarding_slug")
      .maybeSingle();

    const setSlug = (updated as { onboarding_slug?: string } | null)?.onboarding_slug?.trim();
    if (setSlug) {
      return NextResponse.json({ slug: setSlug.toLowerCase() });
    }

    const { data: reread } = await admin
      .from("organizations")
      .select("onboarding_slug")
      .eq("id", orgId)
      .maybeSingle();
    const again = (reread as { onboarding_slug?: string | null } | null)?.onboarding_slug?.trim();
    if (again) {
      return NextResponse.json({ slug: again.toLowerCase() });
    }

    if (uErr?.code === "23505") {
      continue;
    }
    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Could not allocate link. Try again." }, { status: 500 });
}
