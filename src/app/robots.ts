import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/api/",
          "/admin/",
          "/auth/signup",
          "/auth/complete-subscription",
          "/auth/provisioning",
          "/driver/",
          "/track/",
          "/connect-eld/",
          "/auth/connect-eld/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
