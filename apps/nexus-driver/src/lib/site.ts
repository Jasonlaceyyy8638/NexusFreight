import {
  getPasswordResetRedirectUrl,
  getSiteUrl,
} from "../config/env";

/** Public marketing / legal site (no trailing slash). */
export function getPublicSiteUrl(): string {
  return getSiteUrl();
}

export { getPasswordResetRedirectUrl };
