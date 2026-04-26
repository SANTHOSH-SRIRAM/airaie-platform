import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useCardEvidenceList } from '@hooks/useGates';
import {
  groupEvidenceByPassFail,
  formatEvidenceSummary,
} from '@utils/evidenceAggregation';
import { formatRelativeTime } from '@utils/format';
import type { GateEvidence } from '@api/gates';
import EvidenceDetailDrawer from './EvidenceDetailDrawer';

// ---------------------------------------------------------------------------
// CardEvidenceList (D4)
//
// Tabular list of evidence rows for a single card. Click a row to open the
// `EvidenceDetailDrawer`. Used as a denser alternative to `EvidencePanel`
// when the surrounding context already provides headers / filters.
// ---------------------------------------------------------------------------

interface Props {
  cardId: string;
  /** Optional cap on rows shown; remainder collapsed behind a "show more". */
  limit?: number;
}

export default function CardEvidenceList({ cardId, limit }: Props) {
  const { data, isLoading, error, refetch } = useCardEvidenceList(cardId);
  const [selected, setSelected] = useState<GateEvidence | null>(null);
  const [showAll, setShowAll] = useState(false);

  const rows = data ?? [];
  const summary = useMemo(() => groupEvidenceByPassFail(rows), [rows]);
  const visible = limit && !showAll ? rows.slice(0, limit) : rows;

  if (isLoading) {
    return (
      <div className="flex items-center gap-[8px] text-[12px] text-[#acacac] py-[20px]">
        <Loader2 size={14} className="animate-spin" />
        Loading evidence...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-[8px] py-[20px]">
        <AlertCircle size={14} className="text-[#e74c3c]" />
        <span className="text-[12px] text-[#e74c3c]">Failed to load evidence</span>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-[11px] text-[#2196f3] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-[20px] text-[12px] text-[#acacac]">
        No evidence collected yet for this card.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#1a1a1a]">{formatEvidenceSummary(summary)}</span>
      </div>

      <div className="border border-[#e8e8e8] rounded-[8px] overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_90px_70px_120px_70px] bg-[#f5f5f0] px-[12px] py-[6px] text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
          <span>Metric</span>
          <span>Value</span>
          <span>Threshold</span>
          <span>Status</span>
          <span>Source Run</span>
          <span className="text-right">Age</span>
        </div>

        {visible.map((ev) => (
          <button
            key={ev.id}
            type="button"
            onClick={() => setSelected(ev)}
            className="w-full grid grid-cols-[1fr_90px_90px_70px_120px_70px] px-[12px] py-[8px] border-t border-[#f0f0ec] items-center text-[11px] text-left hover:bg-[#fafafa] transition-colors"
          >
            <span className="text-[#1a1a1a] font-mono truncate">{ev.metric_name}</span>
            <span className="text-[#1a1a1a] font-medium">
              {String(ev.metric_value)}
              {ev.unit ? <span className="text-[#acacac] ml-[3px]">{ev.unit}</span> : null}
            </span>
            <span className="text-[#6b6b6b]">
              {ev.threshold !== undefined && ev.threshold !== null
                ? `${ev.operator ?? ''} ${String(ev.threshold)}`.trim()
                : '-'}
            </span>
            <StatusInline ev={ev} />
            <span className="text-[10px] truncate">
              {ev.source_run_id ? (
                <Link
                  to={`/workflow-runs/${ev.source_run_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[#2196f3] font-mono inline-flex items-center gap-[3px] hover:underline"
                >
                  {ev.source_run_id}
                  <ExternalLink size={9} />
                </Link>
              ) : (
                <span className="text-[#acacac]">-</span>
              )}
            </span>
            <span className="text-right text-[10px] text-[#6b6b6b]" title={ev.extracted_at}>
              {formatRelativeTime(ev.extracted_at)}
            </span>
          </button>
        ))}
      </div>

      {limit && rows.length > limit && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-[11px] text-[#2196f3] hover:underline self-start"
        >
          {showAll ? 'Show less' : `Show ${rows.length - limit} more`}
        </button>
      )}

      {selected && (
        <EvidenceDetailDrawer evidence={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function StatusInline({ ev }: { ev: GateEvidence }) {
  if (ev.passed === true) {
    return (
      <span className="inline-flex items-center gap-[3px] text-[#4caf50] text-[9px] font-semibold uppercase">
        <CheckCircle2 size={10} /> Pass
      </span>
    );
  }
  if (ev.passed === false) {
    return (
      <span className="inline-flex items-center gap-[3px] text-[#e74c3c] text-[9px] font-semibold uppercase">
        <XCircle size={10} /> Fail
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-[3px] text-[#ff9800] text-[9px] font-semibold uppercase">
      <AlertTriangle size={10} /> Pending
    </span>
  );
}
