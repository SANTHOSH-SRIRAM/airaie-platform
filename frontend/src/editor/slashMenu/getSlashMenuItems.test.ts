import { describe, it, expect } from 'vitest';
import { getSlashMenuItems, docHasIntentBlock } from './getSlashMenuItems';

describe('docHasIntentBlock', () => {
  it('returns false for empty doc', () => {
    expect(docHasIntentBlock(null)).toBe(false);
    expect(docHasIntentBlock(undefined)).toBe(false);
    expect(docHasIntentBlock({ content: [] })).toBe(false);
  });
  it('returns true when intentBlock present at top level', () => {
    expect(
      docHasIntentBlock({ content: [{ type: 'paragraph' }, { type: 'intentBlock' }] }),
    ).toBe(true);
  });
  it('returns false when only other typed blocks present', () => {
    expect(
      docHasIntentBlock({ content: [{ type: 'inputBlock' }, { type: 'resultBlock' }] }),
    ).toBe(false);
  });
});

describe('getSlashMenuItems', () => {
  it('returns all 3 items when no query and no intentBlock yet', () => {
    const items = getSlashMenuItems('', { docHasIntentBlock: false });
    expect(items.map((i) => i.id)).toEqual(['intent', 'input', 'result']);
  });
  it('hides Intent item when doc already has an intentBlock', () => {
    const items = getSlashMenuItems('', { docHasIntentBlock: true });
    expect(items.map((i) => i.id)).toEqual(['input', 'result']);
  });
  it('filters by case-insensitive substring match on label', () => {
    expect(
      getSlashMenuItems('res', { docHasIntentBlock: false }).map((i) => i.id),
    ).toEqual(['result']);
    expect(
      getSlashMenuItems('IN', { docHasIntentBlock: false }).map((i) => i.id),
    ).toEqual(['intent', 'input']);
  });
  it('filter and cardinality compose', () => {
    expect(
      getSlashMenuItems('in', { docHasIntentBlock: true }).map((i) => i.id),
    ).toEqual(['input']);
  });
  it('returns empty list when query matches nothing', () => {
    expect(getSlashMenuItems('xyz', { docHasIntentBlock: false })).toEqual([]);
  });
  it('whitespace-only query is treated as no filter', () => {
    expect(
      getSlashMenuItems('   ', { docHasIntentBlock: false }).map((i) => i.id),
    ).toEqual(['intent', 'input', 'result']);
  });
});
