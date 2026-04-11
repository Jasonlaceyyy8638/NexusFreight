import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { getSiteUrl } from "@/lib/site-url";
import { CrispChatScript } from "@/components/support/CrispChatScript";
import { CrispIdentitySync } from "@/components/support/CrispIdentitySync";
import { PwaServiceWorkerRegister } from "@/components/pwa/PwaServiceWorkerRegister";
import { ThirdPartyChatWidget } from "@/components/support/ThirdPartyChatWidget";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "NexusFreight | Dispatch & carrier fleet software",
  description:
    "ELD integration, driver dispatch, and carrier settlements for dispatch teams and fleets. One dashboard—office and road.",
  keywords: [
    "freight dispatch software",
    "carrier fleet software",
    "ELD integration",
    "trucking dispatch",
    "driver dispatch",
    "carrier settlements",
    "FMCSA",
    "fleet management logistics",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "NexusFreight",
    title: "NexusFreight | Dispatch & carrier fleet software",
    description:
      "ELD integration, driver dispatch, and settlements for dispatchers and carrier fleets. One dashboard.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NexusFreight | Dispatch & carrier fleet software",
    description:
      "ELD, dispatch, and settlements for dispatch teams and carrier fleets.",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: "NexusFreight",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-[100dvh] flex-col font-sans">
        <PwaServiceWorkerRegister />
        <CrispChatScript />
        <CrispIdentitySync />
        <AppShell>{children}</AppShell>
        <ThirdPartyChatWidget />
      </body>
    </html>
  );
}
