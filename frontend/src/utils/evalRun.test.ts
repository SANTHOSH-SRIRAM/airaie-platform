// E-Evals: tests for pure eval-runner helpers.
import { describe, expect, it } from 'vitest';
import type { EvalRunResponse } from '@api/agentEvals';
import {
  failedCaseIds,
  formatDuration,
  normaliseStatus,
  shouldKeepPolling,
  summarizeEvalRun,
} from './evalRun';

const makeRun = (
  partial: Array<Partial<EvalRunResponse['results'][number]> & { id?: string }> = [],
): EvalRunResponse => ({
  eval_run_id: 'er_test',
  agent_id: 'agt_x',
  version: 1,
  results: partial.map((p, i) => ({
    eval_case_id: p.id ?? `ec_${i}`,
    eval_case_name: p.eval_case_name ?? `Case ${i}`,
    status: p.status ?? 'passed',
    score: p.score ?? 0.8,
    cost: p.cost ?? 0.01,
    action_count: p.action_count ?? 1,
    tools_used: p.tools_used ?? [],
    duration_ms: p.duration_ms ?? 100,
  })),
  summary: {
    total: partial.length,
    passed: 0,
    failed: 0,
    errors: 0,
    pass_rate: 0,
    avg_score: 0,
    avg_cost: 0,
    total_duration_ms: 0,
  },
});

describe('normaliseStatus', () => {
  it('maps passed/pass to passed', () => {
    expect(normaliseStatus('pass')).toBe('passed');
    expect(normaliseStatus('passed')).toBe('passed');
  });
  it('maps error to errored', () => {
    expect(normaliseStatus('error')).toBe('errored');
  });
  it('treats unknown status as failed', () => {
    expect(normaliseStatus('fail')).toBe('failed');
    expect(normaliseStatus('failed')).toBe('failed');
    expect(normaliseStatus('weird')).toBe('failed');
  });
});

describe('formatDuration', () => {
  it('renders sub-second as ms', () => {
    expect(formatDuration(180)).toBe('180ms');
  });
  it('renders seconds with one decimal', () => {
    expect(formatDuration(2400)).toBe('2.4s');
  });
  it('renders minutes + seconds', () => {
    expect(formatDuration(72_000)).toBe('1m 12s');
  });
  it('renders whole minutes without trailing 0s', () => {
    expect(formatDuration(120_000)).toBe('2m');
  });
  it('clamps invalid input to 0ms', () => {
    expect(formatDuration(-5)).toBe('0ms');
    expect(formatDuration(Number.NaN)).toBe('0ms');
  });
});

describe('summarizeEvalRun', () => {
  it('returns zeros for null run', () => {
    const d = summarizeEvalRun(null);
    expect(d.total).toBe(0);
    expect(d.passRate).toBe(0);
    expect(d.durationLabel).toBe('0ms');
  });
  it('counts pass/fail/error and computes pass rate', () => {
    const run = makeRun([
      { status: 'passed', score: 1, duration_ms: 100 },
      { status: 'failed', score: 0.5, duration_ms: 200 },
      { status: 'error', duration_ms: 50 },
    ]);
    const d = summarizeEvalRun(run);
    expect(d.total).toBe(3);
    expect(d.passed).toBe(1);
    expect(d.failed).toBe(1);
    expect(d.errored).toBe(1);
    expect(d.passRate).toBeCloseTo(1 / 3, 5);
    // duration sum = 350ms
    expect(d.durationLabel).toBe('350ms');
  });
  it('excludes errored cases from avgScore / avgCost', () => {
    const run = makeRun([
      { status: 'passed', score: 1.0, cost: 0.10 },
      { status: 'passed', score: 0.5, cost: 0.20 },
      { status: 'error',  score: 0,   cost: 999 },
    ]);
    const d = summarizeEvalRun(run);
    expect(d.avgScore).toBeCloseTo(0.75, 5);
    expect(d.avgCost).toBeCloseTo(0.15, 5);
  });
});

describe('shouldKeepPolling', () => {
  it('returns true for non-terminal statuses', () => {
    expect(shouldKeepPolling('queued')).toBe(true);
    expect(shouldKeepPolling('running')).toBe(true);
  });
  it('returns false for terminal statuses', () => {
    expect(shouldKeepPolling('completed')).toBe(false);
    expect(shouldKeepPolling('failed')).toBe(false);
    expect(shouldKeepPolling(undefined)).toBe(false);
  });
});

describe('failedCaseIds', () => {
  it('returns ids of failed and errored cases only', () => {
    const run = makeRun([
      { id: 'a', status: 'passed' },
      { id: 'b', status: 'failed' },
      { id: 'c', status: 'error' },
      { id: 'd', status: 'pass' },
    ]);
    expect(failedCaseIds(run)).toEqual(['b', 'c']);
  });
  it('returns [] for null', () => {
    expect(failedCaseIds(null)).toEqual([]);
  });
});
