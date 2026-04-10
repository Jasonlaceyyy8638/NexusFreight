import type { SupabaseClient } from "@supabase/supabase-js";

export type CarrierAccess = {
  carrier_id: string;
  org_id: string;
  name: string;
  /** MC docket from FMCSA (carriers.mc_number). */
  mc_number: string | null;
};

export async function getCarrierIfMember(
  supabase: SupabaseClient,
  userId: string,
  carrierId: string
): Promise<CarrierAccess | null> {
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();
  if (pErr || !profile) return null;
  const orgId = (profile as { org_id?: string | null }).org_id?.trim();
  if (!orgId) return null;

  const { data: carrier, error: cErr } = await supabase
    .from("carriers")
    .select("id, org_id, name, mc_number")
    .eq("id", carrierId)
    .maybeSingle();
  if (cErr || !carrier) return null;
  const c = carrier as {
    id: string;
    org_id: string;
    name: string;
    mc_number: string | null;
  };
  if (c.org_id !== orgId) return null;
  return {
    carrier_id: c.id,
    org_id: c.org_id,
    name: c.name,
    mc_number: c.mc_number?.trim() || null,
  };
}
