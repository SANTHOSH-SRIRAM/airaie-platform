/**
 * Primitives — smoke tests verifying each module imports cleanly and
 * exports the expected shape. The components are presentational with no
 * branching logic worth testing as pure functions; we rely on tsc and the
 * `/dev/phase11-card` preview page for visual verification.
 *
 * Runs in vitest env=node without @testing-library/react (matches existing
 * project convention — see CardTopBar.test.tsx note).
 */

import { describe, it, expect } from 'vitest';
import * as primitives from '../index';

describe('primitives module', () => {
  it('exports the seven primitive components', () => {
    const expected = [
      'StagePanel',
      'NumberCircle',
      'StatusBadge',
      'KpiRow',
      'ToolChainCard',
      'EvidenceRow',
      'GateBadge',
    ] as const;
    for (const name of expected) {
      expect(primitives).toHaveProperty(name);
      expect(typeof (primitives as Record<string, unknown>)[name]).toBe('object');
    }
  });

  it('every primitive is a memoized React component (has $$typeof)', () => {
    const components = [
      primitives.StagePanel,
      primitives.NumberCircle,
      primitives.StatusBadge,
      primitives.KpiRow,
      primitives.ToolChainCard,
      primitives.EvidenceRow,
      primitives.GateBadge,
    ];
    for (const C of components) {
      expect(C).toBeDefined();
      expect((C as { $$typeof: symbol }).$$typeof).toBeDefined();
    }
  });
});
