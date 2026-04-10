import type { NextConfig } from "next";
import { resolveMapboxTokenFromProcessEnv } from "./src/lib/mapbox/resolve-mapbox-env";
import {
  resolveStripeMonthlyPriceIdFromEnv,
  resolveStripeYearlyPriceIdFromEnv,
} from "./src/lib/stripe/resolve-stripe-price-env";

const mapboxToken = resolveMapboxTokenFromProcessEnv();
const stripeMonthly = resolveStripeMonthlyPriceIdFromEnv();
const stripeYearly = resolveStripeYearlyPriceIdFromEnv();

const nextEnv: Record<string, string> = {};
if (mapboxToken) nextEnv.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = mapboxToken;
if (stripeMonthly) nextEnv.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY = stripeMonthly;
if (stripeYearly) nextEnv.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY = stripeYearly;

const nextConfig: NextConfig = {
  /** Avoid bundling pdf-parse (reads test fixtures at build time when webpacked). */
  serverExternalPackages: ["pdf-parse"],
  // Browser code only sees NEXT_PUBLIC_*; map non-prefixed names into it at build/start.
  ...(Object.keys(nextEnv).length > 0 ? { env: nextEnv } : {}),
  async redirects() {
    return [
      {
        source: "/signup",
        destination: "/auth/signup",
        permanent: false,
      },
      {
        source: "/manifest.json",
        destination: "/manifest.webmanifest",
        permanent: false,
      },
      {
        source: "/platform",
        destination: "/product-tour",
        permanent: true,
      },
      { source: "/legal/terms", destination: "/terms", permanent: true },
      { source: "/legal/privacy", destination: "/privacy", permanent: true },
      { source: "/about", destination: "/company/about", permanent: true },
      { source: "/careers", destination: "/company/careers", permanent: true },
      {
        source: "/compliance",
        destination: "/company/compliance",
        permanent: true,
      },
      {
        source: "/help/command-center",
        destination: "/product/command-center",
        permanent: true,
      },
      {
        source: "/help/dispatch",
        destination: "/product/dispatch",
        permanent: true,
      },
      {
        source: "/help/settlements",
        destination: "/product/settlements",
        permanent: true,
      },
      {
        source: "/help/live-map",
        destination: "/resources/live-map",
        permanent: true,
      },
      {
        source: "/help/eld-and-security",
        destination: "/resources/eld-integrations",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
