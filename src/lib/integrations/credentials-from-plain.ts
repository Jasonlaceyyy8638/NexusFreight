import type { EldProvider } from "@/types/database";

export type TelematicsStoredCredentials = {
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
};

/**
 * Derives columns from the same string we encrypt (API key or OAuth JSON).
 */
export function credentialsFromPlainToken(
  _provider: EldProvider,
  plainToken: string
): TelematicsStoredCredentials {
  const trimmed = plainToken.trim();
  if (!trimmed) {
    return { access_token: null, refresh_token: null, token_expires_at: null };
  }
  try {
    const j = JSON.parse(trimmed) as {
      access_token?: string;
      refresh_token?: string | null;
      expires_in?: number;
    };
    if (j && typeof j.access_token === "string" && j.access_token.length > 0) {
      const tokenExpiresAt =
        typeof j.expires_in === "number" && Number.isFinite(j.expires_in)
          ? new Date(Date.now() + j.expires_in * 1000).toISOString()
          : null;
      return {
        access_token: j.access_token,
        refresh_token:
          typeof j.refresh_token === "string" ? j.refresh_token : null,
        token_expires_at: tokenExpiresAt,
      };
    }
  } catch {
    /* API key string */
  }
  return {
    access_token: trimmed,
    refresh_token: null,
    token_expires_at: null,
  };
}
