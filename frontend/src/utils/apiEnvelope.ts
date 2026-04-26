// ---------------------------------------------------------------------------
// API envelope helpers
//
// Several backend list endpoints wrap their payload as `{ key: [...], count }`
// rather than returning a bare array. Frontend helpers historically cast the
// response straight to `T[]`, which silently produced no rows because the
// envelope object isn't iterable.
//
// `unwrapList` is the canonical helper for stripping these envelopes while
// remaining defensive against future API changes (already-array responses,
// missing keys, null/undefined). Keep it dependency-free so it can be reused
// from any module without coupling to a specific domain.
// ---------------------------------------------------------------------------

/**
 * Unwrap a `{ <key>: T[] }` envelope into a plain array.
 *
 * Behaviour:
 *   - Object with `key` pointing to an array → returns that array
 *   - Object without the key (or with non-array value) → returns `[]`
 *   - Bare array input → returned as-is (defensive)
 *   - Null / undefined / primitive → returns `[]`
 */
export function unwrapList<T>(raw: unknown, key: string): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>)[key])) {
    return (raw as Record<string, T[]>)[key];
  }
  return [];
}
