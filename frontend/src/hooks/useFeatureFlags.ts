import { useLocation } from 'react-router-dom';

/**
 * Phase 11 (Card UX Streamline) — Wave A feature flag.
 *
 * Returns `true` when the current URL has `?phase11=A`. Wave A renders the
 * new StagePanel-based NodeViews (Method, Intent, Run) when on. Off by
 * default — legacy NodeView rendering is preserved.
 *
 * Notes:
 *   - Case-sensitive on the value: `?phase11=a` does NOT enable the flag.
 *   - Reads via `react-router-dom` `useLocation()` so the hook re-evaluates
 *     on every navigation (no stale `window.location` reads).
 *   - The pure check is exported as `isPhase11AEnabled(search)` so the
 *     parsing rule can be unit-tested without mounting React (the project's
 *     vitest config uses `environment: 'node'` and does NOT have
 *     `@testing-library/react` installed — see useCardRunState.test.ts for
 *     the prior-art note on this pattern).
 */
export function useFeatureFlagPhase11A(): boolean {
  const { search } = useLocation();
  return isPhase11AEnabled(search);
}

/**
 * Pure helper — true when the URL search string carries `?phase11=A`
 * (case-sensitive on the value).
 *
 * Examples:
 *   '?phase11=A'         -> true
 *   '?phase11=a'         -> false
 *   '?phase11=B'         -> false
 *   '?phase11='          -> false
 *   ''                   -> false
 *   '?other=1&phase11=A' -> true
 */
export function isPhase11AEnabled(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get('phase11') === 'A';
}
