// E-Evals: Per-run detail with the case-by-case breakdown.
import { useState } from 'react';
import { ChevronDown, ChevronRight, Repeat } from 'lucide-react';
import type { EvalCriterionResult, EvalRunResponse, EvalRunResult } from '@api/agentEvals';
import { failedCaseIds, formatDuration, normaliseStatus, summarizeEvalRun } from '@utils/evalRun';
import { cn } from '@utils/cn';

interface EvalRunDetailProps {
  run: EvalRunResponse;
  onRerunFailed?: (caseIds: string[]) => void;
  /** True while a follow-up run is being submitted. Disables the rerun button. */
  rerunPending?: boolean;
}

export default function EvalRunDetail({
  run,
  onRerunFailed,
  rerunPending,
}: EvalRunDetailProps) {
  const digest = summarizeEvalRun(run);
  const failedIds = failedCaseIds(run);

  return (
    <section className="rounded-[14px] border border-[#ece9e3] bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-[16px] py-[12px] border-b border-[#ece9e3]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-[#1a1a1a]">Run results</h3>
            <span className="font-mono text-[11px] text-[#8e8a84]">{run.eval_run_id}</span>
            <span className="text-[11px] text-[#8e8a84]">v{run.version}</span>
          </div>
          <p className="text-[12px] text-[#6b6b6b] mt-0.5">
            {digest.passed}/{digest.total} passed · {(digest.passRate * 100).toFixed(0)}% ·{' '}
            {digest.durationLabel} total
          </p>
        </div>

        {failedIds.length > 0 && onRerunFailed && (
          <button
            type="button"
            disabled={rerunPending}
            onClick={() => onRerunFailed(failedIds)}
            className={cn(
              'ml-auto inline-flex items-center gap-1.5 h-[30px] px-[12px] rounded-[8px]',
              'border border-[#ece9e3] bg-white text-[12px] text-[#1a1a1a]',
              'hover:bg-[#fafaf8] disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            <Repeat size={12} /> Re-run {failedIds.length} failed
          </button>
        )}
      </div>

      {/* Body */}
      <div>
        {/* Header row */}
        <div
          className={cn(
            'grid grid-cols-[14px_minmax(0,2fr)_72px_64px_64px_minmax(0,1.4fr)] gap-3 items-center',
            'px-[14px] py-[8px] border-b border-[#ece9e3]',
            'text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8e8a84]',
          )}
        >
          <span aria-hidden="true" />
          <span>Case</span>
          <span>Status</span>
          <span>Score</span>
          <span>Duration</span>
          <span>Tools</span>
        </div>

        {run.results.length === 0 && (
          <div className="px-[16px] py-[20px] text-[12px] text-[#8e8a84]">
            No cases ran.
          </div>
        )}

        {run.results.map((r) => (
          <ResultRow key={r.eval_case_id} result={r} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Row with expand/collapse for criteria + error + proposal preview.
// ---------------------------------------------------------------------------

function ResultRow({ result }: { result: EvalRunResult }) {
  const [expanded, setExpanded] = useState(false);
  const status = normaliseStatus(result.status);
  const hasDetail =
    !!result.error ||
    (result.criteria_results && Object.keys(result.criteria_results).length > 0) ||
    result.proposal != null;

  return (
    <>
      <div
        onClick={() => hasDetail && setExpanded((v) => !v)}
        className={cn(
          'grid grid-cols-[14px_minmax(0,2fr)_72px_64px_64px_minmax(0,1.4fr)] gap-3 items-center',
          'px-[14px] py-[10px] border-b border-[#ece9e3] last:border-b-0',
          hasDetail ? 'cursor-pointer hover:bg-[#fafaf8]' : '',
        )}
      >
        <span className="text-[#bfbcb6]">
          {hasDetail ? (
            expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : null}
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-[#1a1a1a] truncate">
            {result.eval_case_name}
          </div>
          <div className="text-[11px] font-mono text-[#8e8a84] truncate">
            {result.eval_case_id}
          </div>
        </div>
        <div>
          <StatusPill status={status} />
        </div>
        <div className="text-[12px] font-mono text-[#1a1a1a]">
          {Number.isFinite(result.score) ? result.score.toFixed(2) : '—'}
        </div>
        <div className="text-[12px] font-mono text-[#1a1a1a]">
          {formatDuration(result.duration_ms ?? 0)}
        </div>
        <div className="flex flex-wrap gap-1 min-w-0">
          {(result.tools_used ?? []).length === 0 ? (
            <span className="text-[11px] text-[#bfbcb6]">—</span>
          ) : (
            (result.tools_used ?? []).map((t) => (
              <span
                key={t}
                className="font-mono text-[10px] px-1.5 py-[1px] rounded border border-[#ece9e3] text-[#6b6b6b]"
              >
                {t.split('@')[0]}
              </span>
            ))
          )}
        </div>
      </div>

      {expanded && hasDetail && (
        <div className="px-[14px] py-[12px] bg-[#fafaf8] border-b border-[#ece9e3] last:border-b-0">
          {result.error && (
            <div className="rounded-[8px] bg-[#fdecea] border border-[#f5c2c0] px-[10px] py-[8px] text-[12px] text-[#c0392b] mb-3">
              <span className="font-semibold">Error: </span>
              {result.error}
            </div>
          )}

          {result.criteria_results && Object.keys(result.criteria_results).length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#8e8a84] mb-2">
                Criteria
              </p>
              <div className="rounded-[8px] border border-[#ece9e3] bg-white overflow-hidden">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_60px] gap-3 px-[10px] py-[6px] border-b border-[#ece9e3] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8e8a84]">
                  <span>Metric</span>
                  <span>Expected</span>
                  <span>Actual</span>
                  <span>Result</span>
                </div>
                {Object.entries(result.criteria_results).map(([metric, cr]) => (
                  <CriterionRow key={metric} metric={metric} cr={cr} />
                ))}
              </div>
            </div>
          )}

          {result.proposal != null && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[12px] text-[#1976d2] hover:underline">
                Proposal output
              </summary>
              <pre className="mt-2 p-[10px] rounded-[8px] bg-white border border-[#ece9e3] text-[11px] font-mono text-[#1a1a1a] overflow-x-auto max-h-[280px]">
                {safeStringify(result.proposal)}
              </pre>
            </details>
          )}
        </div>
      )}
    </>
  );
}

function CriterionRow({ metric, cr }: { metric: string; cr: EvalCriterionResult }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_60px] gap-3 px-[10px] py-[6px] border-b border-[#ece9e3] last:border-b-0 text-[12px]">
      <span className="font-mono text-[#1a1a1a]">{metric}</span>
      <span className="font-mono text-[#6b6b6b] truncate">{formatVal(cr.expected)}</span>
      <span className="font-mono text-[#6b6b6b] truncate">{formatVal(cr.actual)}</span>
      <span>
        {cr.passed ? (
          <span className="inline-flex items-center px-1.5 py-[1px] rounded-full bg-[#e8f5e9] text-[#2e7d32] text-[10px] font-medium">
            Pass
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-[1px] rounded-full bg-[#fdecea] text-[#c0392b] text-[10px] font-medium">
            Fail
          </span>
        )}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: 'passed' | 'failed' | 'errored' }) {
  const map: Record<typeof status, { label: string; cls: string }> = {
    passed: { label: 'Passed', cls: 'bg-[#e8f5e9] text-[#2e7d32]' },
    failed: { label: 'Failed', cls: 'bg-[#fdecea] text-[#c0392b]' },
    errored: { label: 'Error', cls: 'bg-[#fff4e5] text-[#b76e00]' },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-medium',
        s.cls,
      )}
    >
      {s.label}
    </span>
  );
}

function formatVal(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return v.toString();
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
