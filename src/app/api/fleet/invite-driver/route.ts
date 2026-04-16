import { NextResponse } from "next/server";
import { sendResendPlainText, resendPlainConfigured } from "@/lib/email/resend-plain";
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

function isExistingUserInviteError(err: { message?: string } | null): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("user already exists") ||
    m.includes("email address is already") ||
    m.includes("duplicate key value")
  );
}

function magicLinkFromGeneratePayload(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const props = o.properties;
  if (!props || typeof props !== "object") return null;
  const link = (props as Record<string, unknown>).action_link;
  return typeof link === "string" && link.startsWith("http") ? link : null;
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

  const callback = new URL("/auth/callback", base);
  callback.searchParams.set("next", "/driver/dashboard");

  const inviteMeta = {
    nf_invite: nfInvite,
    org_id: orgId,
    carrier_id: carrierId,
    full_name: fullName,
  };

  const { data: inviteData, error: invErr } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: callback.toString(),
      data: inviteMeta,
    });

  if (invErr) {
    if (isExistingUserInviteError(invErr)) {
      const { data: genData, error: genErr } =
        await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: {
            redirectTo: callback.toString(),
            data: inviteMeta,
          },
        });
      const actionLink = !genErr ? magicLinkFromGeneratePayload(genData) : null;
      if (actionLink && resendPlainConfigured()) {
        try {
          await sendResendPlainText({
            to: email,
            subject: "Sign in to NexusFreight (driver)",
            text: [
              "This email already has a NexusFreight account.",
              "",
              "Open this link to sign in on this device:",
              actionLink,
              "",
              "Or use the Sign in page with your email and password.",
            ].join("\n"),
          });
        } catch (e) {
          return NextResponse.json(
            {
              error:
                e instanceof Error
                  ? e.message
                  : "Could not email a sign-in link.",
            },
            { status: 502 }
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
              via: "magic_link_existing_email",
            },
          });
        } catch {
          /* optional */
        }
        return NextResponse.json({
          ok: true,
          via: "magic_link_existing_email",
          message:
            "That email already had an account. We emailed a sign-in link instead.",
        });
      }
      return NextResponse.json(
        {
          error:
            "That email already has a NexusFreight login. Ask the driver to open Sign in and use Forgot password if they don’t know the password.",
          code: "USER_ALREADY_EXISTS",
        },
        { status: 400 }
      );
    }
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
