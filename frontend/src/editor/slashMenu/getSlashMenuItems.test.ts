import { describe, it, expect } from 'vitest';
import {
  getSlashMenuItems,
  docHasIntentBlock,
  docHasMethodBlock,
  docHasRunBlock,
} from './getSlashMenuItems';

describe('docHasIntentBlock / docHasMethodBlock / docHasRunBlock', () => {
  it('all return false for empty doc', () => {
    expect(docHasIntentBlock(null)).toBe(false);
    expect(docHasMethodBlock(null)).toBe(false);
    expect(docHasRunBlock(null)).toBe(false);
    expect(docHasIntentBlock({ content: [] })).toBe(false);
  });
  it('detect their respective top-level blocks', () => {
    const doc = {
      content: [{ type: 'paragraph' }, { type: 'methodBlock' }, { type: 'runBlock' }],
    };
    expect(docHasMethodBlock(doc)).toBe(true);
    expect(docHasRunBlock(doc)).toBe(true);
    expect(docHasIntentBlock(doc)).toBe(false);
  });
  it('do not detect other typed blocks', () => {
    const doc = {
      content: [{ type: 'inputBlock' }, { type: 'resultBlock' }, { type: 'kpiBlock' }],
    };
    expect(docHasIntentBlock(doc)).toBe(false);
    expect(docHasMethodBlock(doc)).toBe(false);
    expect(docHasRunBlock(doc)).toBe(false);
  });
});

const NO_BLOCKS = {
  docHasIntentBlock: false,
  docHasMethodBlock: false,
  docHasRunBlock: false,
};

describe('getSlashMenuItems', () => {
  it('returns all 16 items when no query and no cardinality flags set', () => {
    const items = getSlashMenuItems('', NO_BLOCKS);
    expect(items.length).toBe(16);
  });
  it('hides Intent when docHasIntentBlock=true', () => {
    const items = getSlashMenuItems('', { ...NO_BLOCKS, docHasIntentBlock: true });
    expect(items.find((i) => i.id === 'intent')).toBeUndefined();
    expect(items.length).toBe(15);
  });
  it('hides Method when docHasMethodBlock=true', () => {
    const items = getSlashMenuItems('', { ...NO_BLOCKS, docHasMethodBlock: true });
    expect(items.find((i) => i.id === 'method')).toBeUndefined();
  });
  it('hides Run when docHasRunBlock=true', () => {
    const items = getSlashMenuItems('', { ...NO_BLOCKS, docHasRunBlock: true });
    expect(items.find((i) => i.id === 'run')).toBeUndefined();
  });
  it('all 3 cardinality flags true → 13 items remain (16 - 3)', () => {
    const items = getSlashMenuItems('', {
      docHasIntentBlock: true,
      docHasMethodBlock: true,
      docHasRunBlock: true,
    });
    expect(items.length).toBe(13);
    expect(items.find((i) => i.id === 'intent')).toBeUndefined();
    expect(items.find((i) => i.id === 'method')).toBeUndefined();
    expect(items.find((i) => i.id === 'run')).toBeUndefined();
  });
  it('layout items pass through filter unchanged when cardinality flags are set', () => {
    const items = getSlashMenuItems('', {
      docHasIntentBlock: true,
      docHasMethodBlock: true,
      docHasRunBlock: true,
    });
    const layoutIds = items.filter((i) => i.kind === 'layout').map((i) => i.id);
    expect(layoutIds).toEqual([
      'heading-1',
      'heading-2',
      'bullet-list',
      'code-block',
      'divider',
    ]);
  });
  it('groups: 11 governance items + 5 layout items', () => {
    const items = getSlashMenuItems('', NO_BLOCKS);
    const governance = items.filter((i) => i.group === 'governance');
    const layout = items.filter((i) => i.group === 'layout');
    expect(governance.length).toBe(11);
    expect(layout.length).toBe(5);
  });
  it('substring filter is case-insensitive on label', () => {
    expect(getSlashMenuItems('Head', NO_BLOCKS).map((i) => i.id)).toEqual([
      'heading-1',
      'heading-2',
    ]);
  });
  it('substring filter is case-insensitive on id', () => {
    expect(getSlashMenuItems('embed', NO_BLOCKS).map((i) => i.id)).toEqual([
      'embed-card',
      'embed-record',
    ]);
  });
  it('filter and cardinality compose', () => {
    // Pick a query that unambiguously matches a single id+label substring
    // — `'list'` only hits `bullet-list`. Hiding Intent (cardinality) doesn't
    // touch this result, but the helper still walks the cardinality flags.
    expect(
      getSlashMenuItems('list', {
        docHasIntentBlock: true,
        docHasMethodBlock: false,
        docHasRunBlock: false,
      }).map((i) => i.id),
    ).toEqual(['bullet-list']);
  });
  it('returns empty list when query matches nothing', () => {
    expect(getSlashMenuItems('zzz_no_match', NO_BLOCKS)).toEqual([]);
  });
  it('whitespace-only query is treated as no filter', () => {
    expect(getSlashMenuItems('   ', NO_BLOCKS).length).toBe(16);
  });
});
