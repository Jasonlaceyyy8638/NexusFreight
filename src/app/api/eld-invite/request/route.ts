import { NextResponse } from "next/server";
import { eldInviteEmailHtml } from "@/lib/email/eld-invite-template";
import { sendTransactionalEmail, sendgridConfigured } from "@/lib/email/sendgrid-send";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  mergePermissionRow,
  type DashboardPermissionFlags,
} from "@/lib/permissions";

export const runtime = "nodejs";

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

type Body = { carrierId?: string };

export async function POST(req: Request) {
  if (!sendgridConfigured()) {
    return NextResponse.json(
      {
        error:
          "SendGrid is not configured (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL).",
      },
      { status: 503 }
    );
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  const userClient = await createServerSupabaseClient();
  if (!userClient) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const carrierId =
    typeof body.carrierId === "string" ? body.carrierId.trim() : "";
  if (!carrierId) {
    return NextResponse.json({ error: "carrierId is required." }, { status: 400 });
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .maybeSingle();
  const orgId = (profile as { org_id?: string; role?: string } | null)?.org_id;
  const role = (profile as { role?: string } | null)?.role;
  if (!orgId) {
    return NextResponse.json({ error: "Profile not found." }, { status: 403 });
  }

  const { data: permRow } = await userClient
    .from("user_permissions")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  const permissions = mergePermissionRow(
    role ?? null,
    permRow as Partial<DashboardPermissionFlags> | null
  );
  const canRequest =
    permissions.admin_access ||
    permissions.can_dispatch_loads ||
    permissions.can_edit_fleet;
  if (!canRequest) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  const { data: orgRow } = await userClient
    .from("organizations")
    .select("type, name")
    .eq("id", orgId)
    .maybeSingle();
  const org = orgRow as { type?: string; name?: string } | null;
  if (org?.type !== "Agency") {
    return NextResponse.json(
      { error: "ELD requests are available from dispatcher (agency) accounts only." },
      { status: 403 }
    );
  }

  const { data: carrier } = await userClient
    .from("carriers")
    .select("id, name, org_id, contact_email")
    .eq("id", carrierId)
    .maybeSingle();
  const c = carrier as {
    id?: string;
    name?: string;
    org_id?: string;
    contact_email?: string | null;
  } | null;
  if (!c?.id || c.org_id !== orgId) {
    return NextResponse.json(
      { error: "Carrier not found in your agency." },
      { status: 403 }
    );
  }

  const carrierEmail = (c.contact_email ?? "").trim();
  if (!carrierEmail) {
    return NextResponse.json(
      {
        error:
          "Add a carrier contact email on the Carriers tab before requesting ELD sync.",
      },
      { status: 400 }
    );
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { data: inserted, error: insErr } = await admin
    .from("eld_connect_invites")
    .insert({
      carrier_id: carrierId,
      agency_org_id: orgId,
      requester_email: user.email,
      carrier_email: carrierEmail,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insErr || !inserted?.id) {
    return NextResponse.json(
      {
        error: insErr?.message ?? "Could not create invite.",
        hint: "Apply migration 00022_eld_connect_invites.sql",
      },
      { status: 500 }
    );
  }

  const token = inserted.id as string;
  const base = appOrigin();
  if (!base) {
    return NextResponse.json(
      {
        error:
          "NEXT_PUBLIC_APP_URL must be set so the magic link can be emailed.",
      },
      { status: 503 }
    );
  }

  const link = `${base}/connect-eld/${token}`;
  const agencyName = org.name ?? "Your dispatcher";

  try {
    await sendTransactionalEmail({
      to: carrierEmail,
      subject: `${agencyName} — sync your fleet with NexusFreight`,
      text: [
        `Hello ${c.name},`,
        ``,
        `Click the link below to select your ELD provider and sync your fleet with ${agencyName}.`,
        ``,
        link,
        ``,
        `This secure link expires in 48 hours.`,
        ``,
        `If you did not expect this message, you can ignore it.`,
      ].join("\n"),
      html: eldInviteEmailHtml({
        carrierName: c.name ?? "there",
        agencyName,
        magicLink: link,
      }),
    });
  } catch {
    await admin.from("eld_connect_invites").delete().eq("id", token);
    return NextResponse.json(
      { error: "Could not send email. Check SendGrid configuration." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, expiresAt });
}
