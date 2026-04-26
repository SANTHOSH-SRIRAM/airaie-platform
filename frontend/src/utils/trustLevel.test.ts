import { describe, it, expect } from 'vitest';
import {
  TRUST_ORDER,
  trustIndex,
  isAllowedTrustStep,
  trustNeedsRationale,
} from './trustLevel';

describe('TRUST_ORDER', () => {
  it('lists the five canonical levels in ascending order', () => {
    expect(TRUST_ORDER).toEqual([
      'untested',
      'community',
      'tested',
      'verified',
      'certified',
    ]);
  });
});

describe('trustIndex', () => {
  it('returns 0 for untested and 4 for certified', () => {
    expect(trustIndex('untested')).toBe(0);
    expect(trustIndex('certified')).toBe(4);
  });
});

describe('isAllowedTrustStep', () => {
  it('allows monotone forward steps between consecutive levels', () => {
    expect(isAllowedTrustStep('untested', 'community')).toBe(true);
    expect(isAllowedTrustStep('community', 'tested')).toBe(true);
    expect(isAllowedTrustStep('tested', 'verified')).toBe(true);
    expect(isAllowedTrustStep('verified', 'certified')).toBe(true);
  });

  it('rejects same-level transitions (no-op blocked at UI)', () => {
    expect(isAllowedTrustStep('untested', 'untested')).toBe(false);
    expect(isAllowedTrustStep('verified', 'verified')).toBe(false);
    expect(isAllowedTrustStep('certified', 'certified')).toBe(false);
  });

  it('rejects any backward step', () => {
    expect(isAllowedTrustStep('community', 'untested')).toBe(false);
    expect(isAllowedTrustStep('certified', 'verified')).toBe(false);
    expect(isAllowedTrustStep('certified', 'untested')).toBe(false);
  });

  it('rejects skipping a level (must go via the intermediate tier)', () => {
    expect(isAllowedTrustStep('untested', 'tested')).toBe(false);
    expect(isAllowedTrustStep('untested', 'verified')).toBe(false);
    expect(isAllowedTrustStep('untested', 'certified')).toBe(false);
    expect(isAllowedTrustStep('community', 'verified')).toBe(false);
    expect(isAllowedTrustStep('tested', 'certified')).toBe(false);
  });
});

describe('trustNeedsRationale', () => {
  it('requires a rationale when promoting to verified', () => {
    expect(trustNeedsRationale('verified')).toBe(true);
  });

  it('requires a rationale when promoting to certified', () => {
    expect(trustNeedsRationale('certified')).toBe(true);
  });

  it('does not require a rationale for community or tested', () => {
    expect(trustNeedsRationale('community')).toBe(false);
    expect(trustNeedsRationale('tested')).toBe(false);
  });

  it('does not require a rationale for untested', () => {
    expect(trustNeedsRationale('untested')).toBe(false);
  });
});
