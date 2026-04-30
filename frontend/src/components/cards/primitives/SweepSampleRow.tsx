import { memo } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge, { type StatusBadgeTone } from './StatusBadge';

// ---------------------------------------------------------------------------
// SweepSampleRow — one row in the Stage-5 sample table for `card_type='sweep'`.
//
// The sweep card's `config.sweep_values` defines N samples; each sample maps
// to one of the card's runs in submission order. The kernel fan-out is what
// drives the run set. This primitive is purely presentational: feed it the
// param value, the status pulled from the matching run, and an optional KPI
// observation if evidence is already extracted.
// ---------------------------------------------------------------------------

export interface SweepSampleRowProps {
  /** display label for the parameter being swept (e.g. "mesh_resolution") */
  paramKey: string;
  /** value of the parameter for this sample */
  paramValue: number | string;
  /** raw status string from the run (running, completed, failed, etc.) */
  runStatus?: string;
  /** run id to deep-link to the workflow-run detail page */
  runId?: string;
  /** optional KPI observation summary, e.g. "1.28 lift_cd" */
  kpiSummary?: string;
}

function statusTone(s?: string): { label: string; tone: StatusBadgeTone } {
  switch (s) {
    case 'completed':
    case 'succeeded':
      return { label: 'PASS', tone: 'success' };
    case 'failed':
      return { label: 'FAIL', tone: 'danger' };
    case 'running':
    case 'waiting':
      return { label: 'RUNNING', tone: 'warning' };
    case 'queued':
      return { label: 'QUEUED', tone: 'neutral' };
    default:
      return { label: 'PENDING', tone: 'neutral' };
  }
}

function SweepSampleRowImpl({
  paramKey,
  paramValue,
  runStatus,
  runId,
  kpiSummary,
}: SweepSampleRowProps) {
  const status = statusTone(runStatus);
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-[14px] rounded-[8px] bg-[#f5f5f0] px-[14px] py-[10px]">
      <span className="font-mono text-[11px] uppercase tracking-wide text-[#554433]/70">
        {paramKey}
      </span>
      <span className="font-mono text-[13px] font-bold text-[#1a1c19]">
        {String(paramValue)}
      </span>
      <span className="font-mono text-[11px] text-[#554433]/70">
        {kpiSummary ?? (runId ? '' : '—')}
      </span>
      {runId ? (
        <Link
          to={`/workflow-runs/${runId}`}
          className="flex items-center gap-[8px] rounded-[6px] px-[8px] py-[4px] hover:bg-white"
        >
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span className="font-mono text-[10px] text-[#554433]/55">
            {runId.length > 14 ? `${runId.slice(0, 14)}…` : runId}
          </span>
        </Link>
      ) : (
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      )}
    </div>
  );
}

export const SweepSampleRow = memo(SweepSampleRowImpl);
export default SweepSampleRow;
