import { createHmac, timingSafeEqual } from "node:crypto";

function unsubscribeSecret(): string {
  return (
    process.env.ANNOUNCEMENT_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "announcement-unsubscribe-dev-only"
  );
}

/** Signed token for one-click unsubscribe (1 year validity). */
export function signAnnouncementUnsubscribe(profileId: string): string {
  const exp = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
  const payload = JSON.stringify({ p: profileId, exp });
  const secret = unsubscribeSecret();
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  const b64 = Buffer.from(payload, "utf8").toString("base64url");
  return `${b64}.${sig}`;
}

export function verifyAnnouncementUnsubscribe(
  token: string
): { profileId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  if (!b64 || !sig) return null;
  let payload: string;
  try {
    payload = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const secret = unsubscribeSecret();
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(sig, "base64url");
    b = Buffer.from(expected, "base64url");
  } catch {
    return null;
  }
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const j = JSON.parse(payload) as { p?: string; exp?: number };
    if (typeof j.p !== "string" || typeof j.exp !== "number") return null;
    if (j.exp < Math.floor(Date.now() / 1000)) return null;
    return { profileId: j.p };
  } catch {
    return null;
  }
}
