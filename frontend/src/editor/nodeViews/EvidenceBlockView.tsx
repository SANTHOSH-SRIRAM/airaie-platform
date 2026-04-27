import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2, AlertCircle, CheckCircle2, XCircle, Info, MinusCircle, Circle } from 'lucide-react';
import { useCardEvidence } from '@hooks/useCards';
import { useCardCanvasContext } from '@/editor/cardCanvasContext';
import { findEvidenceById, formatEvidenceSummary, type EvidenceChip } from './EvidenceBlockView.helpers';

// ---------------------------------------------------------------------------
// EvidenceBlockView — Wave 10-04 NodeView for the `evidenceBlock` Tiptap node.
//
// Reads `attrs.evidenceId`. Pulls the Card's full evidence list once via
// `useCardEvidence(cardId)` (cached and shared with the page's other surfaces),
// then filters by id with a pure helper. Loaded chrome shows the metric +
// value + threshold + an evaluation chip (pass/fail/warning/info).
// ---------------------------------------------------------------------------

const CHIP_STYLES: Record<EvidenceChip, { bg: string; fg: string; label: string; Icon: typeof CheckCircle2 }> = {
  pass:    { bg: '#e8f5e9', fg: '#2e7d32', label: 'Pass',    Icon: CheckCircle2 },
  fail:    { bg: '#ffebee', fg: '#c62828', label: 'Fail',    Icon: XCircle },
  warning: { bg: '#fff8e1', fg: '#ef6c00', label: 'Warning', Icon: MinusCircle },
  info:    { bg: '#e3f2fd', fg: '#1565c0', label: 'Info',    Icon: Info },
  pending: { bg: '#f0f0ec', fg: '#6b6b6b', label: 'Pending', Icon: Circle },
};

function EvidenceBlockViewImpl({ node }: NodeViewProps) {
  const evidenceId = (node.attrs as { evidenceId: string | null }).evidenceId;
  const ctx = useCardCanvasContext();
  const { data: evidenceList, isLoading, error } = useCardEvidence(ctx.cardId ?? undefined);

  // Empty — no evidenceId on the block.
  if (!evidenceId) {
    return (
      <NodeViewWrapper
        data-block-type="evidenceBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <CheckCircle2 size={14} className="text-[#acacac]" aria-hidden="true" />
          <span className="font-semibold">Evidence</span>
          <span className="text-[#acacac]">— not linked</span>
        </div>
        <div className="text-[11px] text-[#acacac] mt-[4px]">
          Link an evidence row by setting the `evidenceId` attribute.
        </div>
      </NodeViewWrapper>
    );
  }

  // Loading.
  if (isLoading) {
    return (
      <NodeViewWrapper
        data-block-type="evidenceBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="status">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          Loading evidence…
        </div>
      </NodeViewWrapper>
    );
  }

  // Error fetching the list.
  if (error) {
    return (
      <NodeViewWrapper
        data-block-type="evidenceBlock"
        className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span>
            Could not load evidence list for card <code className="font-mono">{ctx.cardId ?? '?'}</code>.
          </span>
        </div>
      </NodeViewWrapper>
    );
  }

  const ev = findEvidenceById(evidenceList, evidenceId);

  // Not found in the card's list.
  if (!ev) {
    return (
      <NodeViewWrapper
        data-block-type="evidenceBlock"
        className="my-[8px] rounded-[10px] border border-[#ffe0b2] bg-[#fff8e1] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <AlertCircle size={14} className="text-[#ef6c00]" aria-hidden="true" />
          <span>
            Evidence <code className="font-mono">{evidenceId}</code> not found in this card.
          </span>
        </div>
      </NodeViewWrapper>
    );
  }

  // Loaded.
  const summary = formatEvidenceSummary(ev);
  const chip = CHIP_STYLES[summary.chip];
  const ChipIcon = chip.Icon;

  return (
    <NodeViewWrapper
      data-block-type="evidenceBlock"
      className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
      contentEditable={false}
    >
      <div className="flex items-center gap-[8px]">
        <CheckCircle2 size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[#1a1a1a]">Evidence</span>
        <span
          className="ml-auto inline-flex items-center gap-[4px] text-[10px] uppercase tracking-wide px-[6px] py-[1px] rounded-[4px]"
          style={{ backgroundColor: chip.bg, color: chip.fg }}
        >
          <ChipIcon size={10} aria-hidden="true" />
          {chip.label}
        </span>
      </div>
      <div className="text-[12px] text-[#1a1a1a] mt-[6px] leading-[1.5] font-mono">
        {summary.line1}
      </div>
      <div className="text-[11px] text-[#6b6b6b] mt-[2px]">
        {summary.line2}
      </div>
    </NodeViewWrapper>
  );
}

export const EvidenceBlockView = memo(EvidenceBlockViewImpl);
export default EvidenceBlockView;
