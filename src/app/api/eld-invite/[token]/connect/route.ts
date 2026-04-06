import { NextResponse } from "next/server";
import { telematicsEncryptionConfigured } from "@/lib/crypto/telematics-secret";
import { isEldInviteTokenShape } from "@/lib/eld/invite-token";
import { finalizeMagicLinkEldConnection } from "@/lib/integrations/finalize-magic-link-eld";
import { persistTelematicsToken } from "@/lib/integrations/persist-telematics-token";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { EldProvider } from "@/types/database";

export const runtime = "nodejs";

const API_KEY_PROVIDERS: EldProvider[] = ["samsara", "geotab"];

type Body = { provider?: string; accessToken?: string };

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  if (!telematicsEncryptionConfigured()) {
    return NextResponse.json(
      {
        error:
          "Server is not configured for TELEMATICS_TOKEN_ENCRYPTION_KEY.",
      },
      { status: 503 }
    );
  }

  const { token } = await ctx.params;
  if (!isEldInviteTokenShape(token)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const providerRaw =
    typeof body.provider === "string" ? body.provider.trim().toLowerCase() : "";
  const plain =
    typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  if (!providerRaw || !plain) {
    return NextResponse.json(
      { error: "provider and accessToken are required." },
      { status: 400 }
    );
  }
  if (providerRaw === "motive") {
    return NextResponse.json(
      {
        error:
          "Motive uses OAuth. Use the Motive card and Sign in with Motive on the connect page.",
      },
      { status: 400 }
    );
  }
  if (!API_KEY_PROVIDERS.includes(providerRaw as EldProvider)) {
    return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  }
  const provider = providerRaw as EldProvider;

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 503 });
  }

  const { data: inv, error: invErr } = await admin
    .from("eld_connect_invites")
    .select(
      "id, expires_at, completed_at, carrier_id, agency_org_id, requester_email, requester_profile_id"
    )
    .eq("id", token)
    .maybeSingle();

  if (invErr || !inv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
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

  const nowIso = new Date().toISOString();
  if (
    invite.completed_at != null ||
    new Date(invite.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: carrier } = await admin
    .from("carriers")
    .select("id, name, org_id")
    .eq("id", invite.carrier_id)
    .maybeSingle();
  const c = carrier as { id?: string; name?: string; org_id?: string } | null;
  if (!c?.id || c.org_id !== invite.agency_org_id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const orgId = invite.agency_org_id;
  const saved = await persistTelematicsToken(admin, {
    orgId,
    carrierId: c.id,
    provider,
    plainToken: plain,
  });
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: 500 });
  }

  const finalized = await finalizeMagicLinkEldConnection(admin, {
    inviteRowId: invite.id,
    carrierId: c.id,
    carrierName: c.name ?? "Carrier",
    orgId,
    provider,
    requesterEmail: invite.requester_email,
    requesterProfileId: invite.requester_profile_id,
  });
  if (!finalized.ok) {
    return NextResponse.json({ error: finalized.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
