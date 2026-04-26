import type { GateEvidence } from '@api/gates';

// ---------------------------------------------------------------------------
// Pure helpers for evidence aggregation (D4)
// ---------------------------------------------------------------------------

export interface EvidenceSummary {
  passed: number;
  failed: number;
  pending: number;
  total: number;
  /** 0..1; 0 when total === 0. */
  passRate: number;
}

/**
 * Group an evidence list into pass/fail/pending counts.
 *
 * Pending = `passed` is not strictly true and not strictly false (e.g.
 * `undefined`/`null`). Manual evidence with `evaluation: 'info'` and an
 * unset `passed` flag therefore counts as pending, not failed.
 */
export function groupEvidenceByPassFail(rows: GateEvidence[] | undefined | null): EvidenceSummary {
  if (!rows || rows.length === 0) {
    return { passed: 0, failed: 0, pending: 0, total: 0, passRate: 0 };
  }

  let passed = 0;
  let failed = 0;
  let pending = 0;

  for (const r of rows) {
    if (r.passed === true) {
      passed += 1;
    } else if (r.passed === false) {
      failed += 1;
    } else {
      pending += 1;
    }
  }

  const total = rows.length;
  return {
    passed,
    failed,
    pending,
    total,
    passRate: total === 0 ? 0 : passed / total,
  };
}

/** Format `groupEvidenceByPassFail` output as "X of Y criteria met (Z%)". */
export function formatEvidenceSummary(summary: EvidenceSummary): string {
  if (summary.total === 0) return 'No evidence collected';
  const pct = Math.round(summary.passRate * 100);
  return `${summary.passed} of ${summary.total} criteria met (${pct}%)`;
}
