/**
 * Parse FMCSA date strings (typically MM/DD/YYYY per QCMobile docs) to ISO date YYYY-MM-DD.
 */
export function parseFmcsaAuthorityDate(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (mdy) {
    const mo = Number(mdy[1]);
    const d = Number(mdy[2]);
    const y = Number(mdy[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1900) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return d.toISOString().slice(0, 10);
  }

  return null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar-day age; true when date is in the past and strictly under 90 days old. */
export function authorityDateIsUnder90Days(isoDate: string): boolean {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
  const [y, m, d] = parts;
  const auth0 = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((today0 - auth0) / DAY_MS);
  if (diffDays < 0) return false;
  return diffDays < 90;
}

export function computeIsNewAuthority(authorityDateIso: string | null): boolean {
  if (!authorityDateIso) return false;
  return authorityDateIsUnder90Days(authorityDateIso);
}

const humanFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** e.g. Jan 12, 2024 — for YYYY-MM-DD only (no time component). */
export function formatAuthorityDateHuman(isoDate: string): string {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  if ([y, m, d].some((n) => Number.isNaN(n))) return isoDate;
  return humanFormatter.format(new Date(y, m - 1, d));
}

export type CarrierAuthorityFields = {
  authority_date?: string | null;
  is_new_authority?: boolean | null;
};

/** Prefer live calculation from authority_date when present. */
export function carrierIsNewAuthority(c: CarrierAuthorityFields): boolean {
  if (c.authority_date) return authorityDateIsUnder90Days(c.authority_date);
  return c.is_new_authority === true;
}
