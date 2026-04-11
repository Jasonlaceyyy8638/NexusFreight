import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicCarrierOnboardForm } from "@/components/onboard/PublicCarrierOnboardForm";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Carrier onboarding | NexusFreight",
  robots: { index: false, follow: false },
};

export default async function PublicCarrierOnboardPage({
  params,
}: {
  params: Promise<{ agency_slug: string }>;
}) {
  const { agency_slug } = await params;
  const slug = agency_slug.trim().toLowerCase();
  if (slug.length < 4 || slug.length > 64) {
    notFound();
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return (
      <div className="min-h-[100dvh] bg-[#1A1C1E] px-4 py-16 text-center text-sm text-slate-400">
        Onboarding is temporarily unavailable.
      </div>
    );
  }

  const { data } = await admin
    .from("organizations")
    .select("id")
    .eq("type", "Agency")
    .eq("onboarding_slug", slug)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-[100dvh] bg-[#1A1C1E] text-white">
      <PublicCarrierOnboardForm slug={slug} />
    </div>
  );
}
