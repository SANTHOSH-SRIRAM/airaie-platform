import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCards } from '@hooks/useBoards';
import { useBoardCanvasContext } from '@/editor/boardCanvasContext';
import { useBoardModeRules } from '@hooks/useBoardModeRules';
import { BlockLockChrome } from '@components/cards/primitives';

// ---------------------------------------------------------------------------
// EvidenceRollupBlockView — Wave 10-05c NodeView for the `evidenceRollupBlock`
// Tiptap node. Aggregating evidence at the board level needs a kernel
// endpoint that doesn't yet exist (`GET /v0/boards/{id}/evidence` returning
// CardEvidence[] across all cards). For now we surface a board-level summary
// derived from `useCards(boardId)` — counts cards by status as a proxy for
// "what evidence has been collected" at a glance, and points the user to
// the per-card EvidenceBlock NodeView (10-04) for detail.
//
// When the kernel ships a board-level evidence endpoint, swap the chrome
// below for a real pass/fail/warning rollup mirroring GatesRollupBlockView.
// ---------------------------------------------------------------------------

/** Pure helper — count cards by status. Exported for testing. */
export function summarizeCardStatus(
  cards: { status?: string }[] | undefined,
): { total: number; completed: number; running: number; failed: number; draft: number } {
  const out = { total: 0, completed: 0, running: 0, failed: 0, draft: 0 };
  if (!cards) return out;
  out.total = cards.length;
  for (const c of cards) {
    const s = c.status ?? 'draft';
    if (s === 'completed') out.completed += 1;
    else if (s === 'running' || s === 'queued') out.running += 1;
    else if (s === 'failed' || s === 'blocked') out.failed += 1;
    else out.draft += 1;
  }
  return out;
}

function EvidenceRollupBlockViewImpl(_props: NodeViewProps) {
  const ctx = useBoardCanvasContext();
  const { data: cards, isLoading, error } = useCards(ctx.boardId ?? '');
  const modeRules = useBoardModeRules(ctx.board ?? undefined);
  const locked = !modeRules.canEditBlocks;

  if (!ctx.boardId) {
    return (
      <NodeViewWrapper
        data-block-type="evidenceRollupBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <CheckCircle2 size={14} className="text-[#acacac]" aria-hidden="true" />
          <span className="font-semibold">Evidence Rollup</span>
          <span className="text-[#acacac]">— no board context</span>
        </div>
      </NodeViewWrapper>
    );
  }

  if (isLoading) {
    return (
      <NodeViewWrapper
        data-block-type="evidenceRollupBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="status">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          Loading evidence summary…
        </div>
      </NodeViewWrapper>
    );
  }

  if (error) {
    return (
      <NodeViewWrapper
        data-block-type="evidenceRollupBlock"
        className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span>Could not load board cards for evidence summary.</span>
        </div>
      </NodeViewWrapper>
    );
  }

  const summary = summarizeCardStatus(cards);

  return (
    <NodeViewWrapper
      data-block-type="evidenceRollupBlock"
      className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
      contentEditable={false}
    >
      <BlockLockChrome locked={locked} reason={modeRules.lockReason}>
        <div className="flex items-center gap-[8px]">
          <CheckCircle2 size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
          <span className="text-[12px] font-semibold text-[#1a1a1a]">Evidence Rollup</span>
          <span className="ml-auto text-[10px] text-[#6b6b6b]">{summary.total} card{summary.total === 1 ? '' : 's'}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[6px] mt-[8px]">
          <Stat label="Completed" value={summary.completed} bg="#e8f5e9" fg="#2e7d32" />
          <Stat label="Running" value={summary.running} bg="#fff8e1" fg="#ef6c00" />
          <Stat label="Failed" value={summary.failed} bg="#ffebee" fg="#c62828" />
          <Stat label="Draft" value={summary.draft} bg="#f0f0ec" fg="#6b6b6b" />
        </div>
        <div className="text-[10px] text-[#acacac] mt-[8px]">
          Per-card evidence detail: open a card and look at its Evidence blocks.
          Board-level evidence aggregation arrives when the kernel exposes
          <code className="font-mono mx-[4px]">GET /v0/boards/&#123;id&#125;/evidence</code>.
        </div>
      </BlockLockChrome>
    </NodeViewWrapper>
  );
}

interface StatProps {
  label: string;
  value: number;
  bg: string;
  fg: string;
}

function Stat({ label, value, bg, fg }: StatProps) {
  return (
    <div
      className="rounded-[6px] px-[8px] py-[6px] flex flex-col"
      style={{ backgroundColor: bg, color: fg }}
    >
      <span className="text-[18px] font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}

export const EvidenceRollupBlockView = memo(EvidenceRollupBlockViewImpl);
export default EvidenceRollupBlockView;
