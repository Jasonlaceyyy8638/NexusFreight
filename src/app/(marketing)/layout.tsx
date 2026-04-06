import { MarketingLayoutShell } from "@/components/marketing/MarketingLayoutShell";

export default function MarketingGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MarketingLayoutShell>{children}</MarketingLayoutShell>;
}
