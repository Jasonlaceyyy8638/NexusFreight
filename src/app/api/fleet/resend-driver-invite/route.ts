import { NextResponse } from "next/server";
import { sendResendPlainText, resendPlainConfigured } from "@/lib/email/resend-plain";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  mergePermissionRow,
  type DashboardPermissionFlags,
} from "@/lib/permissions";

export const runtime = "nodejs";

function trimOrigin(v: string | undefined): string {
  return (v ?? "").trim().replace(/\/$/, "");
}

/**
 * Supabase rejects `redirectTo` if it is not in Auth → URL Configuration.
 * Production often has APP_URL vs SITE_URL vs host-only Netlify vars — try each.
 */
function redirectOriginCandidates(): string[] {
  const raw = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.URL,
    process.env.DEPLOY_URL,
    process.env.DEPLOY_PRIME_URL,
  ];
  const out: string[] = [];
  for (const r of raw) {
    const t = trimOrigin(r);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

type Body = {
  driver_id?: string;
};

function extractActionLink(gen: unknown): string | null {
  if (!gen || typeof gen !== "object") return null;
  const o = gen as Record<string, unknown>;
  const props =
    o.properties && typeof o.properties === "object"
      ? (o.properties as Record<string, unknown>)
      : null;
  const candidates = [
    o.action_link,
    o.actionLink,
    props?.action_link,
    props?.actionLink,
    props?.hashed_link,
    (props as { hashed_link?: unknown } | null)?.hashed_link,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && (c.startsWith("http://") || c.startsWith("https://"))) {
      return c;
    }
  }
  /** Some GoTrue versions nest the link under `user` or use alternate keys. */
  const deep = findActionLinkDeep(gen, 0);
  return deep;
}

function findActionLinkDeep(obj: unknown, depth: number): string | null {
  if (depth > 10) return null;
  if (!obj || typeof obj !== "object") return null;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = k.toLowerCase();
    if (
      (key.includes("action_link") || key === "hashed_link" || key === "href") &&
      typeof v === "string" &&
      (v.startsWith("http://") || v.startsWith("https://"))
    ) {
      return v;
    }
    if (typeof v === "object" && v !== null) {
      const inner = findActionLinkDeep(v, depth + 1);
      if (inner) return inner;
    }
  }
  return null;
}

export async function POST(req: Request) {
  const adminClient = createServiceRoleSupabaseClient();
  if (!adminClient) {
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
        code: "NO_AUTH_USER",
      },
      { status: 400 }
    );
  }

  const { data: authData, error: authErr } =
    await adminClient.auth.admin.getUserById(row.auth_user_id);
  if (authErr || !authData?.user) {
    return NextResponse.json(
      { error: "Could not load the driver auth account." },
      { status: 502 }
    );
  }

  const authUser = authData.user;

  const emailRaw =
    (row.contact_email ?? authUser.email ?? "").trim().toLowerCase();
  if (!emailRaw || !emailRaw.includes("@")) {
    return NextResponse.json(
      { error: "Driver is missing a contact email for the invite.", code: "NO_EMAIL" },
      { status: 400 }
    );
  }

  const origins = redirectOriginCandidates();
  if (origins.length === 0) {
    return NextResponse.json(
      {
        error:
          "Set NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL (or deploy URL) so the invite redirect URL can be built.",
        code: "NO_PUBLIC_ORIGIN",
      },
      { status: 503 }
    );
  }

  const nfInvite = isCarrierOrg ? "fleet_driver" : "agency_driver";
  const meta = {
    nf_invite: nfInvite,
    org_id: orgId,
    carrier_id: row.carrier_id,
    full_name: (row.full_name ?? "").trim(),
  };

  type StepErr = { step: string; message: string };
  const stepErrors: StepErr[] = [];

  let lastInviteErrMsg = "";
  let genData: unknown = null;

  originLoop: for (const base of origins) {
    const callback = new URL("/auth/callback", base);
    callback.searchParams.set("next", "/driver/dashboard");
    const redirectTo = callback.toString();
    const inviteOptions = {
      redirectTo,
      data: meta,
    };
    const redirectOnly = { redirectTo };

    const { error: invErr } = await adminClient.auth.admin.inviteUserByEmail(
      emailRaw,
      inviteOptions
    );
    if (invErr) {
      lastInviteErrMsg = invErr.message;
      stepErrors.push({
        step: `inviteUserByEmail @ ${base}`,
        message: invErr.message,
      });
    } else {
      try {
        await adminClient.from("platform_audit_events").insert({
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

    const attempts = [
      () =>
        adminClient.auth.admin.generateLink({
          type: "invite",
          email: emailRaw,
          options: {},
        }),
      () =>
        adminClient.auth.admin.generateLink({
          type: "invite",
          email: emailRaw,
          options: redirectOnly,
        }),
      () =>
        adminClient.auth.admin.generateLink({
          type: "invite",
          email: emailRaw,
          options: inviteOptions,
        }),
      () =>
        adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: emailRaw,
          options: redirectOnly,
        }),
      () =>
        adminClient.auth.admin.generateLink({
          type: "recovery",
          email: emailRaw,
          options: redirectOnly,
        }),
    ];

    const labels = [
      "generateLink(invite, {})",
      "generateLink(invite, redirectOnly)",
      "generateLink(invite, fullOptions)",
      "generateLink(magiclink)",
      "generateLink(recovery)",
    ];

    for (let i = 0; i < attempts.length; i++) {
      const r = await attempts[i]();
      const err = r.error as { message?: string } | null;
      const data = r.data as unknown;
      if (err) {
        stepErrors.push({
          step: `${labels[i]} @ ${base}`,
          message: err.message ?? "unknown error",
        });
      }
      if (!err && data) {
        genData = data;
        break originLoop;
      }
    }
  }

  if (!genData) {
    const sample = origins[0]
      ? `${origins[0]}/auth/callback?next=/driver/dashboard`
      : "";
    return NextResponse.json(
      {
        error:
          "Could not generate a signup or login link. Add every redirect URL you use to Supabase → Authentication → URL Configuration → Redirect URLs.",
        hint: sample
          ? `Include at least: ${sample} (and try again with NEXT_PUBLIC_APP_URL matching production).`
          : undefined,
        code: "LINK_GENERATION_FAILED",
        steps: stepErrors.length
          ? stepErrors
          : [{ step: "inviteUserByEmail", message: lastInviteErrMsg || "unknown" }],
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
    await adminClient.from("platform_audit_events").insert({
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
