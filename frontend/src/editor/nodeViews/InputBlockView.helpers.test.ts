import { describe, it, expect } from 'vitest';
import { formatBytes, formatArtifactSummary } from './InputBlockView.helpers';
import type { BoardArtifact } from '@api/artifacts';

describe('formatBytes', () => {
  it('returns empty for undefined', () => {
    expect(formatBytes(undefined)).toBe('');
  });
  it('uses B under 1024', () => {
    expect(formatBytes(512)).toBe('512 B');
  });
  it('uses KB under 1MB', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });
  it('uses MB under 1GB', () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });
  it('uses GB above 1GB', () => {
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
  });
});

describe('formatArtifactSummary', () => {
  const base: BoardArtifact = {
    id: 'art_1',
    type: 'csv',
    created_at: '',
  };
  it('returns empty for null', () => {
    expect(formatArtifactSummary(null)).toBe('');
  });
  it('uses name when present', () => {
    expect(
      formatArtifactSummary({ ...base, name: 'inflow.csv', size_bytes: 2048 }),
    ).toBe('inflow.csv · csv · 2.0 KB');
  });
  it('falls back to id when name absent', () => {
    expect(formatArtifactSummary(base)).toBe('art_1 · csv');
  });
});
