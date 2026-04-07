import { NextResponse } from "next/server";
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

type Body = {
  email?: string;
  full_name?: string;
  carrier_id?: string;
};

export async function POST(req: Request) {
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

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName =
    typeof body.full_name === "string" ? body.full_name.trim() : "";
  const carrierId =
    typeof body.carrier_id === "string" ? body.carrier_id.trim() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (!carrierId) {
    return NextResponse.json({ error: "carrier_id is required." }, { status: 400 });
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .maybeSingle();
  const orgId = (profile as { org_id?: string } | null)?.org_id;
  const role = (profile as { role?: string } | null)?.role;
  if (!orgId) {
    return NextResponse.json({ error: "Profile not found." }, { status: 403 });
  }

  const { data: orgRow } = await userClient
    .from("organizations")
    .select("type")
    .eq("id", orgId)
    .maybeSingle();
  const orgType = (orgRow as { type?: string } | null)?.type;

  const { data: permRow } = await userClient
    .from("user_permissions")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  const permissions = mergePermissionRow(
    role ?? null,
    permRow as Partial<DashboardPermissionFlags> | null
  );

  const isCarrierOrg = orgType === "Carrier";
  const isAgencyOrg = orgType === "Agency";

  if (!isCarrierOrg && !isAgencyOrg) {
    return NextResponse.json(
      { error: "Driver invites are not available for this organization type." },
      { status: 403 }
    );
  }

  const canInviteCarrier =
    isCarrierOrg &&
    (permissions.admin_access || permissions.can_edit_fleet);
  const canInviteAgency =
    isAgencyOrg &&
    (permissions.admin_access ||
      permissions.can_edit_fleet ||
      permissions.can_dispatch_loads);

  if (!canInviteCarrier && !canInviteAgency) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  const { data: carrier } = await userClient
    .from("carriers")
    .select("id")
    .eq("id", carrierId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!carrier?.id) {
    return NextResponse.json(
      { error: "Carrier not found in your organization." },
      { status: 400 }
    );
  }

  const { data: dupDriver } = await userClient
    .from("drivers")
    .select("id")
    .eq("org_id", orgId)
    .ilike("contact_email", email)
    .maybeSingle();
  if (dupDriver?.id) {
    return NextResponse.json(
      {
        error:
          "A driver with this email is already on your roster. Remove or change the existing record before sending another invite.",
      },
      { status: 400 }
    );
  }

  const base = appOrigin();
  if (!base) {
    return NextResponse.json(
      {
        error:
          "NEXT_PUBLIC_APP_URL must be set so Supabase can redirect after the driver accepts the invite.",
      },
      { status: 503 }
    );
  }

  const nfInvite = isCarrierOrg ? "fleet_driver" : "agency_driver";

  const { data: inviteData, error: invErr } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${base}/driver/dashboard`,
      data: {
        nf_invite: nfInvite,
        org_id: orgId,
        carrier_id: carrierId,
        full_name: fullName,
      },
    });

  if (invErr) {
    return NextResponse.json(
      { error: invErr.message ?? "Invite failed." },
      { status: 400 }
    );
  }

  try {
    await admin.from("platform_audit_events").insert({
      event_type: "driver_invited",
      org_id: orgId,
      actor_user_id: user.id,
      metadata: {
        carrier_id: carrierId,
        invited_email: email,
        scope: nfInvite,
      },
    });
  } catch {
    /* audit table may not exist until migration 00043 */
  }

  return NextResponse.json({ ok: true, userId: inviteData.user?.id });
}
