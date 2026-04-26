import { describe, it, expect } from 'vitest';
import { deriveMetrics } from './agentPlayground';
import type { AgentSession } from '@/types/agentPlayground';

// Minimal session shell — only the fields deriveMetrics actually reads.
function makeSession(overrides: Partial<AgentSession>): AgentSession {
  return {
    id: 'sess_1',
    agent_id: 'agt_1',
    project_id: 'prj_default',
    context: '',
    history: '',
    status: 'active',
    created_at: '2026-04-25T00:00:00Z',
    expires_at: '2026-04-25T01:00:00Z',
    ...overrides,
  };
}

describe('deriveMetrics', () => {
  it('surfaces every field when the backend returns a full metrics block', () => {
    const session = makeSession({
      metrics: {
        iterations: 4,
        total_cost_usd: 0.42,
        budget_remaining_usd: 4.58,
        duration_seconds: 67,
        timeout_seconds: 600,
      },
    });
    const m = deriveMetrics(session);
    expect(m.iterations.current).toBe(4);
    expect(m.totalCost).toBe(0.42);
    expect(m.budgetRemaining).toBe(4.58);
    expect(m.duration).toBe(67);
    expect(m.timeout).toBe(600);
  });

  it('returns undefined for fields the backend omits (partial metrics)', () => {
    const session = makeSession({
      metrics: { iterations: 2 }, // no cost / budget / duration / timeout
    });
    const m = deriveMetrics(session);
    expect(m.iterations.current).toBe(2);
    expect(m.totalCost).toBeUndefined();
    expect(m.budgetRemaining).toBeUndefined();
    expect(m.duration).toBeUndefined();
    expect(m.timeout).toBeUndefined();
  });

  it('falls back to history length when the metrics block is absent entirely', () => {
    // base64({"role":"user","content":"hi"}) twice — pretend two history entries.
    // Not a real backend payload, just testing the mapper degrades gracefully.
    const histPayload = btoa(JSON.stringify([
      { role: 'user', content: 'a', context_updates: {}, timestamp: '2026-04-25T00:00:00Z' },
      { role: 'assistant', content: 'b', context_updates: {}, timestamp: '2026-04-25T00:00:01Z' },
    ]));
    const session = makeSession({ history: histPayload });
    const m = deriveMetrics(session);
    expect(m.iterations.current).toBe(2);
    expect(m.totalCost).toBeUndefined();
    expect(m.budgetRemaining).toBeUndefined();
    expect(m.duration).toBeUndefined();
    expect(m.timeout).toBeUndefined();
  });

  it('does not throw on a malformed metrics shape (numbers replaced by junk)', () => {
    // Cast through unknown to simulate a backend mismatch.
    const session = makeSession({
      metrics: {
        iterations: 3,
        total_cost_usd: 'oops' as unknown as number,
        budget_remaining_usd: null as unknown as number,
        duration_seconds: 'NaN' as unknown as number,
        timeout_seconds: undefined,
      },
    });
    const m = deriveMetrics(session);
    expect(m.iterations.current).toBe(3);
    expect(m.totalCost).toBeUndefined();
    expect(m.budgetRemaining).toBeUndefined();
    expect(m.duration).toBeUndefined();
    expect(m.timeout).toBeUndefined();
  });
});
