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

type Body = {
  driver_id?: string;
};

function extractActionLink(
  gen: unknown
): string | null {
  if (!gen || typeof gen !== "object") return null;
  const props = (gen as { properties?: Record<string, unknown> }).properties;
  if (!props || typeof props !== "object") return null;
  const link =
    props.action_link ??
    props.actionLink ??
    (props as { hashed_link?: string }).hashed_link;
  return typeof link === "string" && link.startsWith("http") ? link : null;
}

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

  const driverId =
    typeof body.driver_id === "string" ? body.driver_id.trim() : "";
  if (!driverId) {
    return NextResponse.json({ error: "driver_id is required." }, { status: 400 });
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

  const { data: driver, error: dErr } = await userClient
    .from("drivers")
    .select("id, org_id, carrier_id, full_name, contact_email, auth_user_id")
    .eq("id", driverId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (dErr || !driver) {
    return NextResponse.json(
      { error: "Driver not found in your organization." },
      { status: 404 }
    );
  }

  const row = driver as {
    id: string;
    carrier_id: string;
    full_name: string | null;
    contact_email: string | null;
    auth_user_id: string | null;
  };

  if (!row.auth_user_id?.trim()) {
    return NextResponse.json(
      {
        error:
          "This driver is not tied to an invited account yet. Send a new invite from the carrier profile or fleet invite form.",
      },
      { status: 400 }
    );
  }

  const { data: authData, error: authErr } =
    await admin.auth.admin.getUserById(row.auth_user_id);
  if (authErr || !authData?.user) {
    return NextResponse.json(
      { error: "Could not load the driver auth account." },
      { status: 502 }
    );
  }

  const authUser = authData.user;
  if (authUser.email_confirmed_at) {
    return NextResponse.json(
      {
        error:
          "This driver has already completed signup. They can sign in with their email and password.",
      },
      { status: 400 }
    );
  }

  const emailRaw =
    (row.contact_email ?? authUser.email ?? "").trim().toLowerCase();
  if (!emailRaw || !emailRaw.includes("@")) {
    return NextResponse.json(
      { error: "Driver is missing a contact email for the invite." },
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

  const meta = {
    nf_invite: nfInvite,
    org_id: orgId,
    carrier_id: row.carrier_id,
    full_name: (row.full_name ?? "").trim(),
  };

  const { error: invErr } = await admin.auth.admin.inviteUserByEmail(emailRaw, {
    redirectTo: callback.toString(),
    data: meta,
  });

  if (!invErr) {
    try {
      await admin.from("platform_audit_events").insert({
        event_type: "driver_invited",
        org_id: orgId,
        actor_user_id: user.id,
        metadata: {
          carrier_id: row.carrier_id,
          invited_email: emailRaw,
          scope: nfInvite,
          resent: true,
          driver_id: row.id,
        },
      });
    } catch {
      /* audit table optional */
    }
    return NextResponse.json({ ok: true, via: "supabase_invite" });
  }

  const invMsg = (invErr.message ?? "").toLowerCase();
  const likelyAlreadyInvited =
    invMsg.includes("already") ||
    invMsg.includes("registered") ||
    invMsg.includes("exists");

  if (!likelyAlreadyInvited) {
    return NextResponse.json(
      { error: invErr.message ?? "Could not resend the invite." },
      { status: 400 }
    );
  }

  const { data: genData, error: genErr } = await admin.auth.admin.generateLink({
    type: "invite",
    email: emailRaw,
    options: {
      redirectTo: callback.toString(),
      data: meta,
    },
  });

  if (genErr || !genData) {
    return NextResponse.json(
      {
        error:
          genErr?.message ||
          invErr.message ||
          "Could not resend the invite. Try again or resend from Supabase Authentication → Users.",
      },
      { status: 400 }
    );
  }

  const actionLink = extractActionLink(genData);
  if (!actionLink) {
    return NextResponse.json(
      {
        error:
          "Invite link could not be generated. Check Supabase Auth logs or try again later.",
      },
      { status: 502 }
    );
  }

  if (!resendPlainConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase could not resend the standard invite email. Set RESEND_API_KEY so we can send a fresh signup link, or copy a link from Supabase Authentication → Users.",
      },
      { status: 503 }
    );
  }

  try {
    await sendResendPlainText({
      to: emailRaw,
      subject: "Complete your NexusFreight driver signup",
      text: [
        "You have a pending NexusFreight driver account.",
        "",
        "Open this link to set your password and finish signup:",
        actionLink,
        "",
        "If you did not expect this message, you can ignore it.",
      ].join("\n"),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not send the invite email via Resend.",
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
        carrier_id: row.carrier_id,
        invited_email: emailRaw,
        scope: nfInvite,
        resent: true,
        driver_id: row.id,
        via: "resend_plain",
      },
    });
  } catch {
    /* optional */
  }

  return NextResponse.json({ ok: true, via: "resend_email" });
}
