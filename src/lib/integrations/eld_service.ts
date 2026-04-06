/**
 * OAuth2 boilerplate for major ELD / fleet telematics providers.
 * Wire credentials via env; exchange codes server-side only in production.
 */

export type OAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export type EldProviderKey = "samsara" | "motive" | "geotab";

const SAMSARA_AUTH = "https://api.samsara.com/oauth2/authorize";
const SAMSARA_TOKEN = "https://api.samsara.com/oauth2/token";

const MOTIVE_AUTH = "https://api.gomotive.com/oauth/authorize";
const MOTIVE_TOKEN = "https://api.gomotive.com/oauth/token";

/** Geotab uses a dynamic server URL; default my.geotab.com for auth discovery */
const GEOTAB_TOKEN = "https://my.geotab.com/apiv1";

export function buildSamsaraAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const u = new URL(SAMSARA_AUTH);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", params.state);
  u.searchParams.set(
    "scope",
    params.scope ?? "fleet-read vehicles-read"
  );
  return u.toString();
}

export async function exchangeSamsaraCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  const res = await fetch(SAMSARA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Samsara token exchange failed: ${res.status}`);
  }
  return res.json() as Promise<OAuthTokenResponse>;
}

export function buildMotiveAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const u = new URL(MOTIVE_AUTH);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", params.state);
  u.searchParams.set("scope", params.scope ?? "fleet.read");
  return u.toString();
}

export async function exchangeMotiveCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  const res = await fetch(MOTIVE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Motive token exchange failed: ${res.status}`);
  }
  return res.json() as Promise<OAuthTokenResponse>;
}

/**
 * Geotab OAuth is account-specific; this posts credentials-style session creation.
 * Many integrations use MyGeotab SDK instead of pure OAuth2 — this is a minimal HTTP stub.
 */
export async function authenticateGeotabSession(params: {
  database: string;
  userName: string;
  password: string;
}): Promise<{ credentials: string; path: string }> {
  const res = await fetch(GEOTAB_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "Authenticate",
      params: {
        database: params.database,
        userName: params.userName,
        password: params.password,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Geotab authenticate failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    result?: { credentials: string; path: string };
  };
  if (!data.result?.credentials) {
    throw new Error("Geotab authenticate: unexpected response");
  }
  return data.result;
}

export async function refreshOAuthToken(
  provider: Exclude<EldProviderKey, "geotab">,
  params: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  }
): Promise<OAuthTokenResponse> {
  const tokenUrl = provider === "samsara" ? SAMSARA_TOKEN : MOTIVE_TOKEN;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`${provider} token refresh failed: ${res.status}`);
  }
  return res.json() as Promise<OAuthTokenResponse>;
}
