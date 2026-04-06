import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BetaSupportBanner } from "@/components/support/BetaSupportBanner";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-screen flex-col font-sans">
        <BetaSupportBanner />
        <div className="flex min-h-screen flex-1 flex-col pt-10">{children}</div>
        <ThirdPartyChatWidget />
      </body>
    </html>
  );
}
