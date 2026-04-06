import { encryptTelematicsSecret } from "@/lib/crypto/telematics-secret";
import { credentialsFromPlainToken } from "@/lib/integrations/credentials-from-plain";
import type { EldProvider } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Upsert encrypted vault row + access_token columns + public eld_connections row.
 */
export async function persistTelematicsToken(
  admin: SupabaseClient,
  input: {
    orgId: string;
    carrierId: string;
    provider: EldProvider;
    plainToken: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const enc = encryptTelematicsSecret(input.plainToken);
  if (!enc) {
    return { ok: false, error: "Encryption failed." };
  }
  const creds = credentialsFromPlainToken(input.provider, input.plainToken);
  const now = new Date().toISOString();
  const { error: vaultErr } = await admin.from("telematics_tokens").upsert(
    {
      org_id: input.orgId,
      carrier_id: input.carrierId,
      provider_type: input.provider,
      ciphertext: enc.ciphertext,
      iv: enc.iv,
      auth_tag: enc.authTag,
      access_token: creds.access_token,
      refresh_token: creds.refresh_token,
      token_expires_at: creds.token_expires_at,
      updated_at: now,
    },
    { onConflict: "carrier_id,provider_type" }
  );
  if (vaultErr) {
    return { ok: false, error: vaultErr.message };
  }
  const { error: eldErr } = await admin.from("eld_connections").upsert(
    {
      org_id: input.orgId,
      carrier_id: input.carrierId,
      provider: input.provider,
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      updated_at: now,
    },
    { onConflict: "carrier_id,provider" }
  );
  if (eldErr) {
    return { ok: false, error: eldErr.message };
  }
  return { ok: true };
}
