import { describe, expect, it } from 'vitest';
import {
  camerasEqual,
  scalarRangesEqual,
  type CameraSnapshot,
  type ScalarRangeSnapshot,
} from './sharedViewState';

// Pure-helper tests per the project's vitest env=node + no @testing-library
// constraint. The Provider + hook surface is tested implicitly via the
// renderers that consume them (Cad3DViewer, VtpViewer); see
// .planning/research/phase-4a-uat-2026-04-30.md for the live UAT pattern.
//
// Phase 9 Plan 09-02 §2C.1.

describe('camerasEqual', () => {
  const base: CameraSnapshot = {
    position: [1, 2, 3],
    target: [0, 0, 0],
    up: [0, 1, 0],
  };

  it('returns true for identical cameras', () => {
    expect(camerasEqual(base, { ...base })).toBe(true);
  });

  it('returns false when position differs by more than epsilon', () => {
    const moved: CameraSnapshot = { ...base, position: [1, 2, 3.001] };
    expect(camerasEqual(base, moved)).toBe(false);
  });

  it('returns true when difference is smaller than epsilon (default 1e-4)', () => {
    const jittered: CameraSnapshot = { ...base, position: [1, 2, 3.00001] };
    expect(camerasEqual(base, jittered)).toBe(true);
  });

  it('returns false when target differs', () => {
    const refocused: CameraSnapshot = { ...base, target: [0.1, 0, 0] };
    expect(camerasEqual(base, refocused)).toBe(false);
  });

  it('returns false when up vector differs', () => {
    const rotated: CameraSnapshot = { ...base, up: [1, 0, 0] };
    expect(camerasEqual(base, rotated)).toBe(false);
  });

  it('honours custom epsilon (loose match)', () => {
    const moved: CameraSnapshot = { ...base, position: [1.05, 2, 3] };
    expect(camerasEqual(base, moved, 0.1)).toBe(true);
  });

  it('honours custom epsilon (strict match)', () => {
    const moved: CameraSnapshot = { ...base, position: [1.05, 2, 3] };
    expect(camerasEqual(base, moved, 1e-6)).toBe(false);
  });
});

describe('scalarRangesEqual', () => {
  const base: ScalarRangeSnapshot = { min: 0, max: 100 };

  it('returns true for identical ranges', () => {
    expect(scalarRangesEqual(base, { ...base })).toBe(true);
  });

  it('returns false when min differs by more than epsilon', () => {
    expect(scalarRangesEqual(base, { min: 0.001, max: 100 })).toBe(false);
  });

  it('returns true when difference is below default epsilon (1e-6)', () => {
    expect(scalarRangesEqual(base, { min: 0.0000001, max: 100 })).toBe(true);
  });

  it('returns false when max differs', () => {
    expect(scalarRangesEqual(base, { min: 0, max: 100.5 })).toBe(false);
  });

  it('honours custom epsilon', () => {
    expect(scalarRangesEqual(base, { min: 0.5, max: 100 }, 1)).toBe(true);
  });
});
