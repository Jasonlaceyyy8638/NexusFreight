import type { SupabaseClient } from "@supabase/supabase-js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Distinct, lowercased emails for every Auth user with an address (paginated).
 * Matches who can sign in — not profiles.auth_email, which may be null.
 */
export async function collectDistinctAuthEmails(
  svc: SupabaseClient
): Promise<string[]> {
  const emails = new Set<string>();
  let page = 1;
  const perPage = 1000;

  for (;;) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }
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
      emails.add(em);
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  return [...emails];
}
