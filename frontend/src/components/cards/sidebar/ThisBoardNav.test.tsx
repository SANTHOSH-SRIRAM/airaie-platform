/**
 * ThisBoardNav — tests for sort/order behavior of the sibling-card listing.
 *
 * Note on test environment:
 *   The frontend uses vitest env=node and does NOT yet install
 *   `@testing-library/react`, so DOM-render tests cannot run here. The
 *   sidebar block's only non-trivial logic is the card ordering (stable
 *   sort by `ordinal` ascending, ties broken by `created_at` ascending
 *   so the order matches the Board's Cards-tab listing).
 *
 *   The remaining logic — current-card highlighting and navigate-on-click —
 *   is straightforward conditional rendering using props the parent
 *   already provides; covering it would require mounting JSX. That's
 *   tracked for the post-MVP testing-infra task.
 */

import { describe, it, expect } from 'vitest';
import { orderCards } from './ThisBoardNav';
import type { Card } from '@/types/card';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(partial: { id: string; ordinal: number; created_at: string; title?: string }): Card {
  return {
    id: partial.id,
    board_id: 'b1',
    card_type: 'analysis',
    title: partial.title ?? `Card ${partial.id}`,
    description: '',
    status: 'draft',
    ordinal: partial.ordinal,
    kpis: [],
    created_at: partial.created_at,
    updated_at: partial.created_at,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('orderCards', () => {
  it('sorts by ordinal ascending', () => {
    const cards = [
      makeCard({ id: 'c3', ordinal: 3, created_at: '2026-01-01T00:00:00Z' }),
      makeCard({ id: 'c1', ordinal: 1, created_at: '2026-01-01T00:00:00Z' }),
      makeCard({ id: 'c2', ordinal: 2, created_at: '2026-01-01T00:00:00Z' }),
    ];
    const result = orderCards(cards);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('breaks ties by created_at ascending', () => {
    const cards = [
      makeCard({ id: 'late', ordinal: 1, created_at: '2026-04-26T15:00:00Z' }),
      makeCard({ id: 'early', ordinal: 1, created_at: '2026-04-26T09:00:00Z' }),
      makeCard({ id: 'middle', ordinal: 1, created_at: '2026-04-26T12:00:00Z' }),
    ];
    const result = orderCards(cards);
    expect(result.map((c) => c.id)).toEqual(['early', 'middle', 'late']);
  });

  it('does not mutate the input array', () => {
    const original = [
      makeCard({ id: 'c2', ordinal: 2, created_at: '2026-01-01T00:00:00Z' }),
      makeCard({ id: 'c1', ordinal: 1, created_at: '2026-01-01T00:00:00Z' }),
    ];
    const snapshot = [...original];
    orderCards(original);
    expect(original).toEqual(snapshot);
  });

  it('handles an empty input list', () => {
    expect(orderCards([])).toEqual([]);
  });
});
