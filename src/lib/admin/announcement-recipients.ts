import type { SupabaseClient } from "@supabase/supabase-js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AnnouncementRecipient = {
  profileId: string;
  email: string;
};

/** user id → primary email from Auth (for rows where profiles.auth_email is null). */
async function authEmailByUserId(
  svc: SupabaseClient
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    for (const u of data.users) {
      const em = u.email?.trim().toLowerCase();
      if (!em || !EMAIL_RE.test(em)) continue;
      const bannedUntil = u.banned_until;
      if (
        bannedUntil &&
        !Number.isNaN(new Date(bannedUntil).getTime()) &&
        new Date(bannedUntil) > new Date()
      ) {
        continue;
      }
      map.set(u.id, em);
    }
    if (data.users.length < perPage) break;
    page += 1;
  }
  return map;
}

/**
 * Every profile row that should receive announcements: not opted out, with a
 * resolvable email (`profiles.auth_email` or, if missing, the Auth user email).
 * Deduped by email (first profile wins).
 */
export async function collectAnnouncementRecipients(
  svc: SupabaseClient
): Promise<AnnouncementRecipient[]> {
  const [authEmails, { data: rows, error }] = await Promise.all([
    authEmailByUserId(svc),
    svc.from("profiles").select("id, auth_email, announcement_emails_opt_out"),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const byEmail = new Map<string, AnnouncementRecipient>();

  for (const r of rows as Array<{
    id: string;
    auth_email: string | null;
    announcement_emails_opt_out: boolean | null;
  }>) {
    if (r.announcement_emails_opt_out === true) continue;
    const fromProfile = r.auth_email?.trim().toLowerCase();
    const fromAuth = authEmails.get(r.id);
    const em =
      fromProfile && EMAIL_RE.test(fromProfile)
        ? fromProfile
        : fromAuth && EMAIL_RE.test(fromAuth)
          ? fromAuth
          : "";
    if (!em) continue;
    if (!byEmail.has(em)) {
      byEmail.set(em, { profileId: r.id, email: em });
    }
  }

  return [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email));
}

/** @deprecated Prefer collectAnnouncementRecipients. */
export async function collectDistinctAuthEmails(
  svc: SupabaseClient
): Promise<string[]> {
  const r = await collectAnnouncementRecipients(svc);
  return r.map((x) => x.email);
}
