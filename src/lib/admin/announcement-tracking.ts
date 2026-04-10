/**
 * Open pixel + click redirect URLs for product announcement emails.
 * Redirect targets are allowlisted to avoid open redirects.
 */

/** Minimal 1×1 transparent GIF. */
export const ANNOUNCEMENT_TRACKING_PIXEL: Buffer = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

function normalizeBaseUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return t.startsWith("http") ? t.replace(/\/$/, "") : `https://${t.replace(/\/$/, "")}`;
}

function collectAllowedHosts(): Set<string> {
  const hosts = new Set<string>();
  const addFromUrl = (raw: string | undefined) => {
    const u = normalizeBaseUrl(raw ?? "");
    if (!u) return;
    try {
      hosts.add(new URL(u).hostname.toLowerCase());
    } catch {
      /* ignore */
    }
  };
  addFromUrl(process.env.NEXT_PUBLIC_SITE_URL);
  addFromUrl(process.env.NEXT_PUBLIC_APP_URL);
  addFromUrl(
    process.env.VERCEL_URL
      ? process.env.VERCEL_URL.startsWith("http")
        ? process.env.VERCEL_URL
        : `https://${process.env.VERCEL_URL}`
      : undefined
  );
  hosts.add("nexusfreight.tech");
  hosts.add("www.nexusfreight.tech");
  hosts.add("localhost");
  hosts.add("127.0.0.1");
  return hosts;
}

/**
 * Only https (or http for localhost) to allowed hosts — used before redirecting after a tracked click.
 */
export function isAllowedTrackedRedirectUrl(destination: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(destination);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") {
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  }
  return parsed.protocol === "https:" && collectAllowedHosts().has(host);
}

export function buildOpenPixelUrl(
  appBaseUrl: string,
  announcementId: string,
  userId: string
): string {
  const base = normalizeBaseUrl(appBaseUrl);
  return `${base}/api/track/open/${encodeURIComponent(announcementId)}/${encodeURIComponent(userId)}`;
}

export function buildClickTrackUrl(
  appBaseUrl: string,
  announcementId: string,
  userId: string,
  destinationUrl: string
): string {
  const base = normalizeBaseUrl(appBaseUrl);
  const q = new URLSearchParams({
    a: announcementId,
    u: userId,
    url: destinationUrl,
  });
  return `${base}/api/track/click?${q.toString()}`;
}
