/**
 * useFeatureFlags — tests for the Phase 11 Wave A URL-driven flag.
 *
 * The hook itself is a 2-line wrapper around `useLocation()` + the pure
 * helper `isPhase11AEnabled`. We test the pure helper directly because
 * the frontend vitest config uses `environment: 'node'` and
 * `@testing-library/react` is not installed (see useCardRunState.test.ts
 * for the prior-art note). The hook's only job is to feed `location.search`
 * into the helper, so coverage of the helper covers the parse-and-decide
 * behavior end-to-end.
 */

import { describe, it, expect } from 'vitest';
import { isPhase11AEnabled } from './useFeatureFlags';

describe('isPhase11AEnabled', () => {
  it('returns true when ?phase11=A is present', () => {
    expect(isPhase11AEnabled('?phase11=A')).toBe(true);
  });

  it('returns false when ?phase11=B is present (different wave)', () => {
    expect(isPhase11AEnabled('?phase11=B')).toBe(false);
  });

  it('returns false when ?phase11= is present with empty value', () => {
    expect(isPhase11AEnabled('?phase11=')).toBe(false);
  });

  it('returns false when no query string is present', () => {
    expect(isPhase11AEnabled('')).toBe(false);
  });

  it('is case-sensitive on the value (?phase11=a returns false)', () => {
    expect(isPhase11AEnabled('?phase11=a')).toBe(false);
  });

  it('returns true when phase11=A appears alongside other params', () => {
    expect(isPhase11AEnabled('?other=1&phase11=A')).toBe(true);
    expect(isPhase11AEnabled('?phase11=A&tab=method')).toBe(true);
  });
});
