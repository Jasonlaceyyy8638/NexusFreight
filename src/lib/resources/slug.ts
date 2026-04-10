/** Paths under /resources that are static marketing pages, not CMS slugs. */
export const RESERVED_RESOURCE_SLUGS = new Set([
  "eld-integrations",
  "live-map",
  "security",
  "support",
]);

export function slugifyTitle(title: string): string {
  const s = title
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s.slice(0, 120);
}

export function normalizeResourceSlug(input: string): string {
  return slugifyTitle(input);
}

export function isReservedResourceSlug(slug: string): boolean {
  return RESERVED_RESOURCE_SLUGS.has(slug.toLowerCase().trim());
}
