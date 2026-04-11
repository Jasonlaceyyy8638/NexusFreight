import { isDispatcherPhoneProvided } from "@/lib/phone/dispatcher-phone";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UserOnboardingFlags = {
  profile_done: boolean;
  carrier_added: boolean;
  doc_uploaded: boolean;
  packet_ready: boolean;
};

/** Full name plus dispatch-ready phone (per settings / SMS templates). */
export function computeProfileDone(profile: {
  full_name?: string | null;
  phone?: string | null;
  phone_number?: string | null;
}): boolean {
  const name = (profile.full_name ?? "").trim();
  const phone = profile.phone_number?.trim() || profile.phone?.trim() || "";
  return name.length >= 2 && isDispatcherPhoneProvided(phone);
}

export async function mergeUserOnboardingWithWorkspace(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<UserOnboardingFlags> {
  const [{ data: profile }, { count: carrierCount }, { data: existing }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, phone, phone_number")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("carriers")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      supabase
        .from("user_onboarding")
        .select("profile_done, carrier_added, doc_uploaded, packet_ready")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  const p = profile as {
    full_name?: string | null;
    phone?: string | null;
    phone_number?: string | null;
  } | null;

  const profileDone = computeProfileDone(p ?? {});
  const carriersTotal = carrierCount ?? 0;
  const carrierAdded = carriersTotal > 0;

  let docUploaded = false;
  if (carrierAdded) {
    const { data: carrierIds } = await supabase
      .from("carriers")
      .select("id")
      .eq("org_id", orgId);
    const ids = (carrierIds ?? []).map((r) => (r as { id: string }).id);
    if (ids.length) {
      const { data: docs } = await supabase
        .from("carrier_documents")
        .select("doc_category")
        .in("carrier_id", ids)
        .in("doc_category", ["w9", "coi"]);
      docUploaded = (docs ?? []).length > 0;
    }
  }

  const ex = existing as UserOnboardingFlags | null;
  const packetSticky = Boolean(ex?.packet_ready);

  const next: UserOnboardingFlags = {
    profile_done: profileDone,
    carrier_added: carrierAdded,
    doc_uploaded: docUploaded,
    packet_ready: packetSticky,
  };

  const baseline: UserOnboardingFlags = ex ?? {
    profile_done: false,
    carrier_added: false,
    doc_uploaded: false,
    packet_ready: false,
  };

  const changed =
    baseline.profile_done !== next.profile_done ||
    baseline.carrier_added !== next.carrier_added ||
    baseline.doc_uploaded !== next.doc_uploaded ||
    baseline.packet_ready !== next.packet_ready;

  if (!ex || changed) {
    await supabase.from("user_onboarding").upsert(
      {
        user_id: userId,
        profile_done: next.profile_done,
        carrier_added: next.carrier_added,
        doc_uploaded: next.doc_uploaded,
        packet_ready: next.packet_ready,
      },
      { onConflict: "user_id" }
    );
  }

  return next;
}

export async function setUserOnboardingPacketReady(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<void> {
  const merged = await mergeUserOnboardingWithWorkspace(supabase, userId, orgId);
  await supabase.from("user_onboarding").upsert(
    {
      user_id: userId,
      profile_done: merged.profile_done,
      carrier_added: merged.carrier_added,
      doc_uploaded: merged.doc_uploaded,
      packet_ready: true,
    },
    { onConflict: "user_id" }
  );
}
