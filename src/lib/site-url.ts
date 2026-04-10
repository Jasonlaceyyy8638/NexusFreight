/**
 * Canonical public site origin for SEO, sitemap, OG URLs, and JSON-LD.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://nexusfreight.tech).
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fallback = "https://nexusfreight.tech";
  if (!raw) return fallback;
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, "");
}
