import { cookies } from "next/headers";
import { DashboardLayoutClient } from "@/components/dashboard/DashboardLayoutClient";
import type { InteractiveDemoVariant } from "@/lib/demo_data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const raw = jar.get("nexus_demo_mode")?.value;
  const demoSession: InteractiveDemoVariant | null =
    raw === "dispatcher" || raw === "carrier" ? raw : null;

  let serverAuthUserId: string | null = null;
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    serverAuthUserId = session?.user?.id ?? null;
  }

  /** Same boolean on SSR and first client paint — avoids hydration mismatch for demo chrome. */
  const serverInteractiveDemoBanner =
    Boolean(demoSession) && !serverAuthUserId;

  return (
    <div className="min-h-[100dvh] w-full bg-[#1A1C1E]">
      <DashboardLayoutClient
        demoSession={demoSession}
        serverInteractiveDemoBanner={serverInteractiveDemoBanner}
      >
        {children}
      </DashboardLayoutClient>
    </div>
  );
}
