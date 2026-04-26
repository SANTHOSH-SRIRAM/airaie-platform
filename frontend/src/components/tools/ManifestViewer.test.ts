import { describe, it, expect } from 'vitest';
import { manifestSection } from './ManifestViewer';

describe('manifestSection', () => {
  it('returns the requested top-level object', () => {
    const m = { metadata: { name: 'tool', version: '1.0' }, runtime: { adapter: 'docker' } };
    expect(manifestSection(m, 'metadata')).toEqual({ name: 'tool', version: '1.0' });
    expect(manifestSection(m, 'runtime')).toEqual({ adapter: 'docker' });
  });

  it('returns undefined for missing keys', () => {
    expect(manifestSection({ metadata: {} }, 'governance')).toBeUndefined();
  });

  it('falls back from "tests" to legacy "testing" section', () => {
    const m = { testing: { test_cases: [{ name: 'a' }] } };
    expect(manifestSection(m, 'tests')).toEqual({ test_cases: [{ name: 'a' }] });
  });

  it('prefers "tests" over "testing" when both exist', () => {
    const m = { tests: { foo: 1 }, testing: { bar: 2 } };
    expect(manifestSection(m, 'tests')).toEqual({ foo: 1 });
  });

  it('returns undefined when manifest is null/undefined/non-object', () => {
    expect(manifestSection(undefined, 'metadata')).toBeUndefined();
    expect(manifestSection(null, 'metadata')).toBeUndefined();
    expect(manifestSection('not an object', 'metadata')).toBeUndefined();
    expect(manifestSection(42, 'metadata')).toBeUndefined();
  });

  it('returns undefined when section value is not an object', () => {
    const m = { metadata: 'oops' };
    expect(manifestSection(m, 'metadata')).toBeUndefined();
  });
});
