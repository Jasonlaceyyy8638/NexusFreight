import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
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
  title: "NexusFreight | Unified Operating System for Modern Logistics",
  description:
    "Real-time ELD integration, automated driver dispatch, and instant carrier settlements. Built for the office, engineered for the road.",
  appleWebApp: {
    capable: true,
    title: "NexusFreight",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1c1e",
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
