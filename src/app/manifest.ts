import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NexusFreight Control Center",
    short_name: "NexusFreight",
    description:
      "Unified operating system for logistics — dispatch, compliance, and settlements.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d0e10",
    theme_color: "#1a1c1e",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
