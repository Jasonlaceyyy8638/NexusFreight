import type { SupabaseClient } from "@supabase/supabase-js";
import { collectAnnouncementRecipients } from "@/lib/admin/announcement-recipients";

const CHUNK = 200;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export type InactiveAnnouncementRecipient = {
  profile_id: string;
  email: string;
  full_name: string | null;
  last_open_at: string | null;
};

/**
 * Announcement-eligible profiles whose last tracked HTML open (any send) is
 * missing or older than `inactiveDays`.
 */
export async function listInactiveAnnouncementRecipients(
  svc: SupabaseClient,
  inactiveDays = 7
): Promise<InactiveAnnouncementRecipient[]> {
  const eligible = await collectAnnouncementRecipients(svc);
  if (eligible.length === 0) return [];

  const ids = eligible.map((r) => r.profileId);
  const lastOpenByProfile = new Map<string, string>();

  for (const part of chunk(ids, CHUNK)) {
    const { data, error } = await svc
      .from("announcement_stats")
      .select("user_id, opened_at")
      .in("user_id", part)
      .not("opened_at", "is", null);

    if (error) {
      console.error("[listInactiveAnnouncementRecipients]", error.message);
      continue;
    }

    for (const row of data as Array<{ user_id: string; opened_at: string }>) {
      const prev = lastOpenByProfile.get(row.user_id);
      if (!prev || row.opened_at > prev) {
        lastOpenByProfile.set(row.user_id, row.opened_at);
      }
    }
  }

  const cutoffMs = Date.now() - inactiveDays * 24 * 60 * 60 * 1000;
  const inactiveIds: string[] = [];

  for (const r of eligible) {
    const last = lastOpenByProfile.get(r.profileId);
    if (last == null || new Date(last).getTime() < cutoffMs) {
      inactiveIds.push(r.profileId);
    }
  }

  if (inactiveIds.length === 0) return [];

  const nameById = new Map<string, string | null>();
  for (const part of chunk(inactiveIds, CHUNK)) {
    const { data, error } = await svc
      .from("profiles")
      .select("id, full_name")
      .in("id", part);

    if (error) {
      console.error("[listInactiveAnnouncementRecipients] profiles", error.message);
      continue;
    }
    for (const p of data as Array<{ id: string; full_name: string | null }>) {
      nameById.set(p.id, p.full_name);
    }
  }

  const emailById = new Map(eligible.map((e) => [e.profileId, e.email]));

  return inactiveIds.map((profile_id) => ({
    profile_id,
    email: emailById.get(profile_id) ?? "",
    full_name: nameById.get(profile_id) ?? null,
    last_open_at: lastOpenByProfile.get(profile_id) ?? null,
  }));
}
