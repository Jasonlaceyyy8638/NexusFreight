import { NextResponse } from "next/server";
import { telematicsEncryptionConfigured } from "@/lib/crypto/telematics-secret";
import { persistTelematicsToken } from "@/lib/integrations/persist-telematics-token";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EldProvider } from "@/types/database";

export const runtime = "nodejs";

const PROVIDERS: EldProvider[] = ["samsara", "motive", "geotab"];

type Body = {
  carrierId?: string;
  provider?: string;
  accessToken?: string;
};

export async function POST(req: Request) {
  if (!telematicsEncryptionConfigured()) {
    return NextResponse.json(
      {
        error:
          "Server is not configured for TELEMATICS_TOKEN_ENCRYPTION_KEY (set a strong passphrase).",
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

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const carrierId = typeof body.carrierId === "string" ? body.carrierId.trim() : "";
  const providerRaw = typeof body.provider === "string" ? body.provider.trim().toLowerCase() : "";
  const token =
    typeof body.accessToken === "string" ? body.accessToken.trim() : "";

  if (!carrierId || !providerRaw || !token) {
    return NextResponse.json(
      { error: "carrierId, provider, and accessToken are required." },
      { status: 400 }
    );
  }

  if (!PROVIDERS.includes(providerRaw as EldProvider)) {
    return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  }
  const provider = providerRaw as EldProvider;

  const userClient = await createServerSupabaseClient();
  if (!userClient) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();
  const orgId = (profile as { org_id?: string } | null)?.org_id;
  if (!orgId) {
    return NextResponse.json({ error: "Profile not found." }, { status: 403 });
  }

  const { data: carrier } = await userClient
    .from("carriers")
    .select("id, org_id")
    .eq("id", carrierId)
    .maybeSingle();
  const c = carrier as { id?: string; org_id?: string } | null;
  if (!c?.id || c.org_id !== orgId) {
    return NextResponse.json(
      { error: "Carrier not found in your organization." },
      { status: 403 }
    );
  }

  const saved = await persistTelematicsToken(admin, {
    orgId,
    carrierId,
    provider,
    plainToken: token,
  });
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
