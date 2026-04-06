import type { NextConfig } from "next";
import { resolveMapboxTokenFromProcessEnv } from "./src/lib/mapbox/resolve-mapbox-env";

const mapboxToken = resolveMapboxTokenFromProcessEnv();

const nextConfig: NextConfig = {
  // Browser code only sees NEXT_PUBLIC_*; map non-prefixed names into it at build/start.
  ...(mapboxToken
    ? {
        env: {
          NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: mapboxToken,
        },
      }
    : {}),
  async redirects() {
    return [
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
