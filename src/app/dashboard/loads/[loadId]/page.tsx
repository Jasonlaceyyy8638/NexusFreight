import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LoadDetailPageClient } from "@/components/dashboard/LoadDetailPageClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Load } from "@/types/database";

type PageProps = { params: Promise<{ loadId: string }> };

export default async function LoadDetailRoutePage({ params }: PageProps) {
  const { loadId } = await params;
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center text-sm text-slate-400">
        <p>Sign in to view load details.</p>
        <Link
          href="/dashboard/loads"
          className="mt-4 inline-block text-[#3395ff] hover:underline"
        >
          Back to loads
        </Link>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/signup");
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();
  const orgId = (profileRow as { org_id?: string } | null)?.org_id;
  if (!orgId) {
    notFound();
  }

  const { data: loadRow, error } = await supabase
    .from("loads")
    .select("*")
    .eq("id", loadId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !loadRow) {
    notFound();
  }

  const load = loadRow as Load;
  const { data: carrierRow } = await supabase
    .from("carriers")
    .select("name")
    .eq("id", load.carrier_id)
    .maybeSingle();
  const carrierName =
    (carrierRow as { name?: string } | null)?.name ?? null;

  return <LoadDetailPageClient load={load} carrierName={carrierName} />;
}
