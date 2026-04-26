import { describe, it, expect } from 'vitest';
import { isKnownBlockType, parseDoc, serializeDoc } from './serialize';
import { isTypedBlock, TYPED_BLOCK_KINDS, type CardBodyDoc } from '@/types/cardBlocks';

const sampleDoc: CardBodyDoc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Beam analysis' }] },
    { type: 'intentBlock', attrs: { intentSpecId: 'int_abc' } },
    { type: 'paragraph', content: [{ type: 'text', text: 'Investigate vibration modes.' }] },
    { type: 'inputBlock', attrs: { artifactId: 'art_geo', portName: 'geometry' } },
    {
      type: 'kpiBlock',
      attrs: {
        metricKey: 'first_natural_frequency_hz',
        operator: 'between',
        threshold: [10, 30],
      },
    },
    { type: 'methodBlock', attrs: { planId: 'plan_xyz' } },
    { type: 'runBlock', attrs: {} },
    { type: 'resultBlock', attrs: { artifactId: 'art_field' } },
    { type: 'evidenceBlock', attrs: { evidenceId: 'cevd_123' } },
    { type: 'gateBlock', attrs: { gateId: 'gate_1' } },
    { type: 'embedCardBlock', attrs: { cardId: 'card_2' } },
    { type: 'embedRecordBlock', attrs: { recordId: 'rec_3' } },
    { type: 'aiAssistBlock', attrs: { conversationId: 'conv_4' } },
    {
      type: 'callout',
      attrs: { variant: 'info' },
      content: [{ type: 'text', text: 'Govern note.' }],
    },
    { type: 'horizontalRule' },
  ],
};

describe('serialize / parse round-trip', () => {
  it('serializeDoc(parseDoc(doc)) === doc for the canonical sample', () => {
    const parsed = parseDoc(sampleDoc);
    expect(parsed).not.toBeNull();
    expect(serializeDoc(parsed!)).toEqual(sampleDoc);
  });

  it('serializeDoc round-trips an empty doc', () => {
    const empty: CardBodyDoc = { type: 'doc', content: [{ type: 'paragraph' }] };
    expect(serializeDoc(empty)).toEqual(empty);
  });

  it('parseDoc returns null for non-doc input', () => {
    expect(parseDoc(null)).toBeNull();
    expect(parseDoc(undefined)).toBeNull();
    expect(parseDoc({ type: 'paragraph' })).toBeNull();
    expect(parseDoc('not a doc')).toBeNull();
  });

  it('parseDoc tolerates a doc missing `content`', () => {
    const parsed = parseDoc({ type: 'doc' });
    expect(parsed).toEqual({ type: 'doc', content: [] });
  });

  it('serializeDoc filters unknown block kinds silently', () => {
    const dirty = {
      type: 'doc',
      content: [
        { type: 'paragraph' },
        { type: 'unknownBlockFromAFutureVersion', attrs: { foo: 1 } },
        { type: 'inputBlock', attrs: { artifactId: 'art_a' } },
      ],
    } as unknown as CardBodyDoc;
    const cleaned = serializeDoc(dirty);
    expect(cleaned.content.map((b) => b.type)).toEqual(['paragraph', 'inputBlock']);
  });

  it('filters unknown blocks from nested content (e.g. inside a list)', () => {
    const nested: CardBodyDoc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph' },
                { type: 'fakeKind', attrs: {} } as unknown as CardBodyDoc['content'][number],
              ],
            },
          ],
        },
      ],
    };
    const cleaned = serializeDoc(nested);
    const listItem = (cleaned.content[0]?.content?.[0] as { content?: CardBodyDoc['content'] }).content;
    expect(listItem?.map((b) => b.type)).toEqual(['paragraph']);
  });

  it('preserves text marks (bold, italic, link, code)', () => {
    const withMarks: CardBodyDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'bold',
              marks: [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://x.com' } }],
            },
          ],
        },
      ],
    };
    const cleaned = serializeDoc(withMarks);
    const para = cleaned.content[0]!;
    const textNode = para.content?.[0];
    expect(textNode?.marks?.length).toBe(2);
    expect(textNode?.marks?.[0]?.type).toBe('bold');
    expect(textNode?.marks?.[1]?.attrs?.href).toBe('https://x.com');
  });

  it('preserves empty `attrs` for runBlock (no attrs to discard)', () => {
    const doc: CardBodyDoc = {
      type: 'doc',
      content: [{ type: 'runBlock', attrs: {} }],
    };
    const cleaned = serializeDoc(doc);
    expect(cleaned.content[0]!.type).toBe('runBlock');
  });
});

describe('isKnownBlockType', () => {
  it('accepts all 11 typed governance kinds', () => {
    for (const kind of TYPED_BLOCK_KINDS) {
      expect(isKnownBlockType(kind)).toBe(true);
    }
  });

  it('accepts the layout/text kinds', () => {
    for (const kind of [
      'doc',
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'listItem',
      'blockquote',
      'codeBlock',
      'horizontalRule',
      'hardBreak',
      'text',
      'callout',
    ]) {
      expect(isKnownBlockType(kind)).toBe(true);
    }
  });

  it('rejects unknown kinds and non-strings', () => {
    expect(isKnownBlockType('unknown')).toBe(false);
    expect(isKnownBlockType('')).toBe(false);
    expect(isKnownBlockType(null)).toBe(false);
    expect(isKnownBlockType(undefined)).toBe(false);
    expect(isKnownBlockType(42)).toBe(false);
  });
});

describe('isTypedBlock', () => {
  it('returns true for typed governance blocks only', () => {
    for (const kind of TYPED_BLOCK_KINDS) {
      expect(isTypedBlock({ type: kind, attrs: {} as never })).toBe(true);
    }
    expect(isTypedBlock({ type: 'paragraph' })).toBe(false);
    expect(isTypedBlock({ type: 'callout', attrs: { variant: 'info' } })).toBe(false);
    expect(isTypedBlock({ type: 'heading', attrs: { level: 1 } })).toBe(false);
  });
});
