// E-Evals: Pure helpers for the eval runner UI.
//
// Kept dependency-free so they can be unit-tested without a React or
// React-Query render harness.
import type { EvalCaseStatus, EvalRunResponse, EvalRunResult } from '@api/agentEvals';

/** Normalise the two status spellings the backend currently emits. */
export function normaliseStatus(
  s: EvalCaseStatus | string,
): 'passed' | 'failed' | 'errored' {
  if (s === 'pass' || s === 'passed') return 'passed';
  if (s === 'error') return 'errored';
  return 'failed';
}

export interface EvalRunDigest {
  total: number;
  passed: number;
  failed: number;
  errored: number;
  /** 0..1, NaN when total === 0. */
  passRate: number;
  /** Already formatted, e.g. "2.4s" or "180ms". */
  durationLabel: string;
  /** Average score across non-errored cases (0 when none). */
  avgScore: number;
  /** Average cost across non-errored cases ($). */
  avgCost: number;
}

export function summarizeEvalRun(run: EvalRunResponse | undefined | null): EvalRunDigest {
  if (!run) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      errored: 0,
      passRate: 0,
      durationLabel: '0ms',
      avgScore: 0,
      avgCost: 0,
    };
  }
  // Recompute from `results` as the source of truth — the server's
  // `summary` block agrees, but recomputing keeps the helper self-contained
  // for future async-runner shapes.
  const total = run.results.length;
  let passed = 0;
  let failed = 0;
  let errored = 0;
  let scoreSum = 0;
  let costSum = 0;
  let durationMs = 0;
  for (const r of run.results) {
    durationMs += r.duration_ms ?? 0;
    const s = normaliseStatus(r.status);
    if (s === 'passed') passed++;
    else if (s === 'errored') errored++;
    else failed++;
    if (s !== 'errored') {
      scoreSum += r.score ?? 0;
      costSum += r.cost ?? 0;
    }
  }
  const scoredCount = total - errored;
  return {
    total,
    passed,
    failed,
    errored,
    passRate: total === 0 ? 0 : passed / total,
    durationLabel: formatDuration(durationMs),
    avgScore: scoredCount === 0 ? 0 : scoreSum / scoredCount,
    avgCost: scoredCount === 0 ? 0 : costSum / scoredCount,
  };
}

/** "180ms", "2.4s", "1m 12s". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
  const minutes = Math.floor(totalSec / 60);
  const seconds = Math.round(totalSec - minutes * 60);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

/**
 * Pure decision: should the caller keep polling for a run with this status?
 * The current backend is synchronous so this returns false unconditionally
 * for known terminal statuses, but the helper exists so an async runner can
 * be wired up by flipping this one function.
 */
export function shouldKeepPolling(
  status: 'queued' | 'running' | 'completed' | 'failed' | string | undefined,
): boolean {
  return status === 'queued' || status === 'running';
}

/** Filter the `results[]` array down to just the failed/errored case ids — used
 *  by the `Re-run failed` button. */
export function failedCaseIds(run: EvalRunResponse | undefined | null): string[] {
  if (!run) return [];
  return run.results
    .filter((r): r is EvalRunResult => {
      const s = normaliseStatus(r.status);
      return s === 'failed' || s === 'errored';
    })
    .map((r) => r.eval_case_id);
}
