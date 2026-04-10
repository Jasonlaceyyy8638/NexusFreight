import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

/** Public URLs to help Google discover marketing and help content. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const paths: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"];
    priority: number;
  }> = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/product-tour", changeFrequency: "weekly", priority: 0.95 },
    { path: "/help", changeFrequency: "weekly", priority: 0.85 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
    { path: "/company/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/company/careers", changeFrequency: "monthly", priority: 0.5 },
    { path: "/company/compliance", changeFrequency: "monthly", priority: 0.6 },
    { path: "/product/command-center", changeFrequency: "monthly", priority: 0.75 },
    { path: "/product/dispatch", changeFrequency: "monthly", priority: 0.75 },
    { path: "/product/platform", changeFrequency: "monthly", priority: 0.75 },
    { path: "/product/settlements", changeFrequency: "monthly", priority: 0.75 },
    { path: "/resources", changeFrequency: "weekly", priority: 0.78 },
    { path: "/resources/eld-integrations", changeFrequency: "monthly", priority: 0.72 },
    { path: "/resources/live-map", changeFrequency: "monthly", priority: 0.72 },
    { path: "/resources/security", changeFrequency: "monthly", priority: 0.65 },
    { path: "/resources/support", changeFrequency: "monthly", priority: 0.72 },
    { path: "/legal/data-processing", changeFrequency: "yearly", priority: 0.35 },
    { path: "/auth/login", changeFrequency: "monthly", priority: 0.5 },
  ];

  const cmsResourcePaths: typeof paths = [];
  const svc = createServiceRoleSupabaseClient();
  if (svc) {
    const { data } = await svc
      .from("resources")
      .select("slug, published_at, updated_at")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString());
    if (data) {
      for (const row of data) {
        if (!row.slug) continue;
        cmsResourcePaths.push({
          path: `/resources/${row.slug}`,
          changeFrequency: "monthly",
          priority: 0.74,
        });
      }
    }
  }

  const merged = [...paths, ...cmsResourcePaths];
  const seen = new Set<string>();
  const deduped = merged.filter((entry) => {
    if (seen.has(entry.path)) return false;
    seen.add(entry.path);
    return true;
  });
  const now = new Date();
  return deduped.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
