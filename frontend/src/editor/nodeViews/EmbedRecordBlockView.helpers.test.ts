import { describe, it, expect } from 'vitest';
import { formatRecordPreview } from './EmbedRecordBlockView';

describe('formatRecordPreview', () => {
  it('returns empty string for undefined content', () => {
    expect(formatRecordPreview(undefined)).toBe('');
  });

  it('returns full text when shorter than max', () => {
    expect(formatRecordPreview({ text: 'Short note' }, 120)).toBe('Short note');
  });

  it('truncates long text with ellipsis', () => {
    const long = 'A'.repeat(200);
    const out = formatRecordPreview({ text: long }, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith('…')).toBe(true);
  });

  it('falls back to JSON.stringify for non-text content', () => {
    expect(formatRecordPreview({ foo: 'bar', n: 42 })).toBe('{"foo":"bar","n":42}');
  });

  it('treats blank text as empty and falls back', () => {
    expect(formatRecordPreview({ text: '   ', kind: 'note' })).toBe('{"text":"   ","kind":"note"}');
  });
});
