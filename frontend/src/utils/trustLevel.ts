import type { TrustLevel } from '@/types/tool';

/**
 * Canonical ordering of ATP trust levels (low → high). Mirrors the
 * `TrustLevelOrder` map in `airaie-kernel/internal/model/model.go`.
 */
export const TRUST_ORDER: readonly TrustLevel[] = [
  'untested',
  'community',
  'tested',
  'verified',
  'certified',
] as const;

/**
 * Human-readable description for each trust level. Surfaced in the
 * `TrustLevelDialog` radio list so users understand what each tier means.
 */
export const TRUST_DESCRIPTIONS: Record<TrustLevel, string> = {
  untested: 'Never run / no track record.',
  community: 'At least one successful run; informally trusted.',
  tested: 'Passed declared self-tests in CI.',
  verified: 'Third-party reviewed + passes integration suite.',
  certified: 'Signed by a maintainer with audit trail.',
};

/**
 * Numeric rank of a trust level. Returns -1 for an unrecognized value so
 * callers can treat unknown input as below `untested`.
 */
export function trustIndex(level: TrustLevel): number {
  const idx = TRUST_ORDER.indexOf(level);
  return idx === -1 ? -1 : idx;
}

/**
 * Returns true if moving from `from` to `to` is a single forward step.
 *
 * Mirrors the kernel's strictly-forward rule (`IsTrustLevelProgression`)
 * but additionally enforces a *monotone +1* constraint at the UI: users
 * cannot skip levels (e.g. untested → tested) even though the backend
 * would currently allow it. This keeps escalations deliberate and
 * reviewable. Same-level and backward steps are rejected.
 */
export function isAllowedTrustStep(from: TrustLevel, to: TrustLevel): boolean {
  const f = trustIndex(from);
  const t = trustIndex(to);
  if (f === -1 || t === -1) return false;
  return t - f === 1;
}

/**
 * Returns true when promoting *to* the given level should require a
 * rationale (per ATP-SPEC §governance, `verified` and `certified` are
 * audit-bearing tiers).
 */
export function trustNeedsRationale(to: TrustLevel): boolean {
  return to === 'verified' || to === 'certified';
}
