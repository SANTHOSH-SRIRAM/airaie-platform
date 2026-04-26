/**
 * Reads the airaie_csrf cookie set by the backend at login/refresh and used
 * for double-submit CSRF protection. The backend only enforces matching
 * X-CSRF-Token headers when AIRAIE_CSRF_REQUIRED=true is set; this utility
 * always attaches the header when the cookie is present so we're forward-
 * compatible with enforcement being flipped on without a frontend release.
 */

export const CSRF_COOKIE_NAME = 'airaie_csrf';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Returns the value of the airaie_csrf cookie, or null when the cookie is
 * absent (e.g. unauthenticated, or before the migration shipped).
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const prefix = `${CSRF_COOKIE_NAME}=`;
  // document.cookie is a `;`-separated list of `name=value` pairs.
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      const value = trimmed.slice(prefix.length);
      // Strip surrounding quotes if any (shouldn't happen, but cheap).
      if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
      }
      return value;
    }
  }
  return null;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Returns true for methods that don't require CSRF tokens. */
export function isSafeMethod(method?: string): boolean {
  return SAFE_METHODS.has((method ?? 'GET').toUpperCase());
}
