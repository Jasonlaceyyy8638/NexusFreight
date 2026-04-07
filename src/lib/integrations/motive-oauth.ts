const MOTIVE_AUTHORIZE = "https://api.gomotive.com/oauth/authorize";
const MOTIVE_TOKEN = "https://api.gomotive.com/oauth/token";

/** Prefer MOTIVE_CLIENT_ID; fall back to MOTIVE_OAUTH_CLIENT_ID. */
export function resolveMotiveClientId(): string | undefined {
  const a = process.env.MOTIVE_CLIENT_ID?.trim();
  const b = process.env.MOTIVE_OAUTH_CLIENT_ID?.trim();
  return a || b || undefined;
}

/** Prefer MOTIVE_CLIENT_SECRET; fall back to MOTIVE_OAUTH_CLIENT_SECRET. */
export function resolveMotiveClientSecret(): string | undefined {
  const a = process.env.MOTIVE_CLIENT_SECRET?.trim();
  const b = process.env.MOTIVE_OAUTH_CLIENT_SECRET?.trim();
  return a || b || undefined;
}

/** Enough to redirect to Motive authorization (client_id + redirect URI). */
export function motiveAuthorizeConfigured(): boolean {
  return Boolean(resolveMotiveClientId() && motiveOAuthRedirectUri());
}

/** Full OAuth: authorize + token exchange. */
export function motiveOAuthConfigured(): boolean {
  return Boolean(
    resolveMotiveClientId() &&
      resolveMotiveClientSecret() &&
      motiveOAuthRedirectUri()
  );
}

export function defaultMotiveScopes(): string {
  return (
    process.env.MOTIVE_OAUTH_SCOPES?.trim() ||
    "fleet_management.read fleet_locations.read"
  );
}

/** Prefer MOTIVE_REDIRECT_URI; else `{NEXT_PUBLIC_APP_URL}/api/eld-invite/motive/callback`. */
export function motiveOAuthRedirectUri(): string | null {
  const explicit =
    process.env.MOTIVE_REDIRECT_URI?.trim() ||
    process.env.MOTIVE_OAUTH_REDIRECT_URI?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!base) return null;
  return `${base}/api/eld-invite/motive/callback`;
}

export function buildMotiveAuthorizeUrl(inviteToken: string): string | null {
  const clientId = resolveMotiveClientId();
  const redirectUri = motiveOAuthRedirectUri();
  if (!clientId || !redirectUri) return null;

  const u = new URL(MOTIVE_AUTHORIZE);
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", inviteToken);
  u.searchParams.set("scope", defaultMotiveScopes());
  return u.toString();
}

export type MotiveTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

export async function refreshMotiveAccessToken(
  refreshToken: string
): Promise<MotiveTokenResponse | null> {
  const clientId = resolveMotiveClientId();
  const clientSecret = resolveMotiveClientSecret();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken.trim(),
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(MOTIVE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return null;
  try {
    return (await res.json()) as MotiveTokenResponse;
  } catch {
    return null;
  }
}

export async function exchangeMotiveAuthorizationCode(
  code: string
): Promise<MotiveTokenResponse | null> {
  const clientId = resolveMotiveClientId();
  const clientSecret = resolveMotiveClientSecret();
  const redirectUri = motiveOAuthRedirectUri();
  if (!clientId || !clientSecret || !redirectUri) return null;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(MOTIVE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    return null;
  }
  try {
    return (await res.json()) as MotiveTokenResponse;
  } catch {
    return null;
  }
}
