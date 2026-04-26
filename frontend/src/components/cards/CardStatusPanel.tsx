import { useState } from 'react';
import { RotateCcw, X, Download, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useCardEvidence } from '@hooks/useCards';
import { useCardGates } from '@hooks/useGates';
import { useRunDetail, useRunArtifacts, useCancelRun } from '@hooks/useRuns';
import { useExecutePlan } from '@hooks/usePlans';
import ConfigSection from './ConfigSection';
import type { Card, CardStatus } from '@/types/card';
import type { IntentSpec } from '@/types/intent';
import type { CardModeRules } from '@hooks/useCardModeRules';

// ---------------------------------------------------------------------------
// CardStatusPanel — in-body Status surface paired with CardExecutionSequence.
// Shows: status, mode, last run summary, evidence/gate counts, and (when a
// run has completed) Results + Evidence detail rows.
//
// This is distinct from ThisCardStatusPill in the sidebar — both subscribe
// to the same React Query keys (cardKeys.detail, cardKeys.evidence,
// gateKeys.forCard) so they stay in sync automatically without explicit
// coordination.
// ---------------------------------------------------------------------------

interface CardStatusPanelProps {
  card: Card;
  intent: IntentSpec | undefined;
  rules: CardModeRules;
  /** Latest run id passed in from CardDetailPage so all body sections share
   *  the same run-detail subscription rather than re-querying the run list. */
  latestRunId?: string | null;
}

const STATUS_DOT: Record<CardStatus, { dot: string; label: string }> = {
  draft: { dot: 'bg-[#9e9e9e]', label: 'Draft' },
  ready: { dot: 'bg-[#2196f3]', label: 'Ready to run' },
  queued: { dot: 'bg-[#ff9800]', label: 'Queued' },
  running: { dot: 'bg-[#2196f3] animate-pulse', label: 'Running' },
  completed: { dot: 'bg-[#4caf50]', label: 'Completed' },
  failed: { dot: 'bg-[#e74c3c]', label: 'Failed' },
  blocked: { dot: 'bg-[#ff9800]', label: 'Blocked' },
  skipped: { dot: 'bg-[#9e9e9e] opacity-50', label: 'Skipped' },
};

function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export default function CardStatusPanel({
  card,
  intent,
  rules,
  latestRunId,
}: CardStatusPanelProps) {
  // Auto-refresh evidence while a run is in flight so KPI rows fill in live.
  const isRunning = card.status === 'running' || card.status === 'queued';
  const { data: evidence } = useCardEvidence(card.id, isRunning);
  const { data: gates } = useCardGates(card.id, card.board_id);
  const { data: runDetail } = useRunDetail(latestRunId ?? null);
  const { data: runArtifacts } = useRunArtifacts(
    runDetail?.status === 'succeeded' || runDetail?.status === 'failed'
      ? latestRunId ?? null
      : null,
  );
  const cancelRun = useCancelRun();
  const executePlan = useExecutePlan(card.id, card.board_id);
  const [actionError, setActionError] = useState<string | null>(null);

  // Counts
  const kpiTotal = intent?.acceptance_criteria?.length ?? 0;
  const evidenceWithMatch = (evidence ?? []).filter((e) =>
    intent?.acceptance_criteria?.some((c) => c.metric === e.metric_key),
  );
  const kpiCollected = new Set(evidenceWithMatch.map((e) => e.metric_key)).size;

  const requiredGates = (gates ?? []).filter((g) => g.gate_type !== 'review' || rules.requiresPeerReview);
  const passedGates = requiredGates.filter((g) => g.status === 'PASSED' || g.status === 'WAIVED');

  const statusCfg = STATUS_DOT[card.status] ?? STATUS_DOT.draft;
  const runComplete = runDetail?.status === 'succeeded' || runDetail?.status === 'failed';

  const handleCancel = async () => {
    setActionError(null);
    if (!latestRunId) {
      setActionError('No active run to cancel');
      return;
    }
    try {
      await cancelRun.mutateAsync(latestRunId);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to cancel run';
      setActionError(msg);
    }
  };

  const handleRerun = async () => {
    setActionError(null);
    try {
      await executePlan.mutateAsync();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to start re-run';
      setActionError(msg);
    }
  };

  return (
    <ConfigSection title="Card Status">
      {/* ── Live state ────────────────────────────────────── */}
      <dl className="grid grid-cols-[120px_1fr] gap-y-[8px] gap-x-[12px] text-[12px]">
        <dt className="text-[#6b6b6b]">Status</dt>
        <dd className="flex items-center gap-[6px]">
          <span className={`w-[8px] h-[8px] rounded-full ${statusCfg.dot}`} aria-hidden="true" />
          <span className="text-[#1a1a1a] font-medium">{statusCfg.label}</span>
        </dd>

        <dt className="text-[#6b6b6b]">Mode</dt>
        <dd className="text-[#f57c00] font-medium capitalize">{rules.mode}</dd>

        <dt className="text-[#6b6b6b]">Last run</dt>
        <dd className="text-[#1a1a1a]">
          {runDetail ? (
            <>
              <span className="text-[10px] text-[#acacac] mr-[6px]">
                {runDetail.id.slice(0, 12)}
              </span>
              <span className="font-medium">{runDetail.status}</span>
              <span className="text-[#acacac] mx-[4px]">·</span>
              <span className="text-[#6b6b6b] tabular-nums">
                {formatDuration(runDetail.duration)}
              </span>
            </>
          ) : (
            <span className="text-[#acacac]">—</span>
          )}
        </dd>

        <dt className="text-[#6b6b6b]">Evidence</dt>
        <dd className="text-[#1a1a1a] tabular-nums">
          {kpiCollected}/{kpiTotal} KPIs collected
        </dd>

        <dt className="text-[#6b6b6b]">Gates</dt>
        <dd className="text-[#1a1a1a] tabular-nums">
          {passedGates.length}/{requiredGates.length} required passed
        </dd>
      </dl>

      {/* ── Footer actions ─────────────────────────────────── */}
      {(isRunning || runComplete) && (
        <div className="mt-[12px] pt-[12px] border-t border-[#f0f0ec] flex items-center gap-[8px]">
          {isRunning && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelRun.isPending}
              aria-label="Cancel running run"
              className="inline-flex items-center gap-[4px] h-[28px] px-[10px] rounded-[6px] bg-[#ffebee] text-[#e74c3c] text-[11px] font-medium hover:bg-[#ffcdd2] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <X size={11} />
              {cancelRun.isPending ? 'Cancelling…' : 'Cancel Run'}
            </button>
          )}
          {runComplete && (
            <button
              type="button"
              onClick={handleRerun}
              disabled={executePlan.isPending || !rules.canRun}
              aria-label="Re-run card"
              className="inline-flex items-center gap-[4px] h-[28px] px-[10px] rounded-[6px] bg-[#1a1a1a] text-white text-[11px] font-medium hover:bg-[#2d2d2d] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw size={11} />
              {executePlan.isPending ? 'Starting…' : 'Re-run'}
            </button>
          )}
          {actionError && (
            <span role="alert" className="text-[10px] text-[#e74c3c]">
              {actionError}
            </span>
          )}
        </div>
      )}

      {/* ── Results + Evidence detail (only on run complete) ──── */}
      {runComplete && (
        <div className="mt-[16px] pt-[12px] border-t border-[#f0f0ec] grid grid-cols-2 gap-[16px]">
          {/* Left: Results (artifact list) */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#6b6b6b] mb-[8px]">
              Results
            </h3>
            {(runArtifacts ?? []).length === 0 ? (
              <p className="text-[11px] text-[#acacac]">No artifacts produced.</p>
            ) : (
              <ul className="flex flex-col gap-[4px]" aria-label="Run artifacts">
                {(runArtifacts ?? []).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-[6px] text-[11px] hover:bg-[#fafafa] rounded-[4px] px-[6px] py-[4px]"
                  >
                    <Download size={10} className="text-[#acacac] shrink-0" />
                    <span className="font-medium text-[#1a1a1a] truncate flex-1">
                      {a.name ?? a.id.slice(0, 12)}
                    </span>
                    <span className="text-[10px] text-[#acacac]">{a.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right: Evidence rows (one per acceptance criterion) */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#6b6b6b] mb-[8px]">
              Evidence
            </h3>
            {kpiTotal === 0 ? (
              <p className="text-[11px] text-[#acacac]">No KPIs defined.</p>
            ) : (
              <ul className="flex flex-col gap-[4px]" aria-label="Acceptance criteria evidence">
                {(intent?.acceptance_criteria ?? []).map((c) => {
                  const ev = evidenceWithMatch.find((e) => e.metric_key === c.metric);
                  return (
                    <li
                      key={c.id || c.metric}
                      className="flex items-center gap-[6px] text-[11px] px-[6px] py-[4px] rounded-[4px]"
                    >
                      {ev ? (
                        ev.evaluation === 'pass' ? (
                          <CheckCircle2 size={11} className="text-[#4caf50] shrink-0" aria-label="Pass" />
                        ) : ev.evaluation === 'fail' ? (
                          <XCircle size={11} className="text-[#e74c3c] shrink-0" aria-label="Fail" />
                        ) : (
                          <AlertTriangle size={11} className="text-[#ff9800] shrink-0" aria-label="Warning" />
                        )
                      ) : (
                        <AlertTriangle size={11} className="text-[#acacac] shrink-0" aria-label="Pending" />
                      )}
                      <span className="text-[#1a1a1a] truncate flex-1">{c.metric}</span>
                      <span className="text-[10px] text-[#6b6b6b] tabular-nums">
                        {ev ? ev.metric_value : '—'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </ConfigSection>
  );
}
