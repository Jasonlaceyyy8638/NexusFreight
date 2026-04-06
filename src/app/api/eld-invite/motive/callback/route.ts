import { NextResponse } from "next/server";
import { telematicsEncryptionConfigured } from "@/lib/crypto/telematics-secret";
import { isEldInviteTokenShape } from "@/lib/eld/invite-token";
import { finalizeMagicLinkEldConnection } from "@/lib/integrations/finalize-magic-link-eld";
import {
  exchangeMotiveAuthorizationCode,
} from "@/lib/integrations/motive-oauth";
import { persistTelematicsToken } from "@/lib/integrations/persist-telematics-token";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function redirectTo(req: Request, path: string): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return `${env}${path.startsWith("/") ? path : `/${path}`}`;
  return new URL(path, req.url).toString();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim() ?? "";
  const state = searchParams.get("state")?.trim() ?? "";
  const oauthErr = searchParams.get("error");

  if (!state || !isEldInviteTokenShape(state)) {
    return NextResponse.redirect(redirectTo(req, "/auth/signup"));
  }

  const fail = (reason: string) =>
    NextResponse.redirect(
      redirectTo(
        req,
        `/connect-eld/${encodeURIComponent(state)}?motive_error=${encodeURIComponent(reason)}`
      )
    );

  if (oauthErr || !code) {
    return fail(oauthErr || "denied");
  }

  if (!telematicsEncryptionConfigured()) {
    return fail("encrypt");
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return fail("server");
  }

  const { data: inv, error: invErr } = await admin
    .from("eld_connect_invites")
    .select(
      "id, expires_at, completed_at, carrier_id, agency_org_id, requester_email, requester_profile_id"
    )
    .eq("id", state)
    .maybeSingle();

  if (invErr || !inv) {
    return fail("invite");
  }

  const invite = inv as {
    id: string;
    expires_at: string;
    completed_at: string | null;
    carrier_id: string;
    agency_org_id: string;
    requester_email: string | null;
    requester_profile_id: string | null;
  };

  if (
    invite.completed_at != null ||
    new Date(invite.expires_at).getTime() <= Date.now()
  ) {
    return fail("invite");
  }

  const { data: carrier } = await admin
    .from("carriers")
    .select("id, name, org_id")
    .eq("id", invite.carrier_id)
    .maybeSingle();
  const c = carrier as { id?: string; name?: string; org_id?: string } | null;
  if (!c?.id || c.org_id !== invite.agency_org_id) {
    return fail("invite");
  }

  const tokens = await exchangeMotiveAuthorizationCode(code);
  if (!tokens?.access_token) {
    return fail("token");
  }

  const plain = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_in: tokens.expires_in ?? null,
    token_type: tokens.token_type ?? "bearer",
  });

  const orgId = invite.agency_org_id;
  const saved = await persistTelematicsToken(admin, {
    orgId,
    carrierId: c.id,
    provider: "motive",
    plainToken: plain,
  });
  if (!saved.ok) {
    return fail("save");
  }

  const done = await finalizeMagicLinkEldConnection(admin, {
    inviteRowId: invite.id,
    carrierId: c.id,
    carrierName: c.name ?? "Carrier",
    orgId,
    provider: "motive",
    requesterEmail: invite.requester_email,
    requesterProfileId: invite.requester_profile_id,
  });
  if (!done.ok) {
    return fail("finalize");
  }

  const { data: orgRow } = await admin
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();
  const agencyName =
    (orgRow as { name?: string } | null)?.name ?? "your dispatcher";

  return NextResponse.redirect(
    redirectTo(
      req,
      `/connect-eld/${encodeURIComponent(state)}?verified=1&provider=motive&agency=${encodeURIComponent(agencyName)}`
    )
  );
}
