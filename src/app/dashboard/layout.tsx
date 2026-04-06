import { cookies } from "next/headers";
import { DashboardLayoutClient } from "@/components/dashboard/DashboardLayoutClient";
import type { InteractiveDemoVariant } from "@/lib/demo_data";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const raw = jar.get("nexus_demo_mode")?.value;
  const demoSession: InteractiveDemoVariant | null =
    raw === "dispatcher" || raw === "carrier" ? raw : null;

  return (
    <DashboardLayoutClient demoSession={demoSession}>
      {children}
    </DashboardLayoutClient>
  );
}
