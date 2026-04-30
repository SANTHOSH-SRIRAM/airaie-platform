import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2, AlertCircle, ShieldCheck, CheckCircle2, XCircle, Circle, Clock, Hand } from 'lucide-react';
import { useGateList } from '@hooks/useGates';
import { useBoardCanvasContext } from '@/editor/boardCanvasContext';
import { useBoardModeRules } from '@hooks/useBoardModeRules';
import { BlockLockChrome } from '@components/cards/primitives';
import type { Gate, GateStatus } from '@/types/gate';

// ---------------------------------------------------------------------------
// GatesRollupBlockView — Wave 10-05c NodeView for the `gatesRollupBlock`
// Tiptap node. Aggregates the board's gates and surfaces status counts at
// the top + a clickable list below. Gate sign-off chrome is intentionally
// NOT included here — the per-card GateBlockView (10-04) handles that;
// the rollup is a read-only board-level dashboard.
// ---------------------------------------------------------------------------

const STATUS_TOKENS: Record<
  GateStatus,
  { label: string; bg: string; fg: string; Icon: typeof CheckCircle2 }
> = {
  PENDING:    { label: 'Pending',    bg: '#fff8e1', fg: '#ef6c00', Icon: Clock },
  EVALUATING: { label: 'Evaluating', bg: '#e3f2fd', fg: '#1565c0', Icon: Circle },
  PASSED:     { label: 'Passed',     bg: '#e8f5e9', fg: '#2e7d32', Icon: CheckCircle2 },
  FAILED:     { label: 'Failed',     bg: '#ffebee', fg: '#c62828', Icon: XCircle },
  WAIVED:     { label: 'Waived',     bg: '#f0f0ec', fg: '#6b6b6b', Icon: Hand },
};

/** Pure helper — count gates by status. Exported for unit testing. */
export function summarizeGateCounts(gates: Gate[] | undefined): Record<GateStatus, number> {
  const counts: Record<GateStatus, number> = {
    PENDING: 0, EVALUATING: 0, PASSED: 0, FAILED: 0, WAIVED: 0,
  };
  if (!gates) return counts;
  for (const g of gates) counts[g.status] = (counts[g.status] ?? 0) + 1;
  return counts;
}

function GatesRollupBlockViewImpl(_props: NodeViewProps) {
  const ctx = useBoardCanvasContext();
  const { data: gates, isLoading, error } = useGateList(ctx.boardId ?? undefined);
  const modeRules = useBoardModeRules(ctx.board ?? undefined);
  const locked = !modeRules.canEditBlocks;

  if (!ctx.boardId) {
    return (
      <NodeViewWrapper
        data-block-type="gatesRollupBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <ShieldCheck size={14} className="text-[#acacac]" aria-hidden="true" />
          <span className="font-semibold">Gates Rollup</span>
          <span className="text-[#acacac]">— no board context</span>
        </div>
      </NodeViewWrapper>
    );
  }

  if (isLoading) {
    return (
      <NodeViewWrapper
        data-block-type="gatesRollupBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="status">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          Loading gates…
        </div>
      </NodeViewWrapper>
    );
  }

  if (error) {
    return (
      <NodeViewWrapper
        data-block-type="gatesRollupBlock"
        className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span>Could not load gates for this board.</span>
        </div>
      </NodeViewWrapper>
    );
  }

  const list: Gate[] = gates ?? [];
  const counts = summarizeGateCounts(list);

  return (
    <NodeViewWrapper
      data-block-type="gatesRollupBlock"
      className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
      contentEditable={false}
    >
      <BlockLockChrome locked={locked} reason={modeRules.lockReason}>
      <div className="flex items-center gap-[8px]">
        <ShieldCheck size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[#1a1a1a]">Gates Rollup</span>
        <span className="ml-auto text-[10px] text-[#6b6b6b]">{list.length} gate{list.length === 1 ? '' : 's'}</span>
      </div>
      {/* Status-count strip */}
      <div className="flex flex-wrap gap-[6px] mt-[8px]">
        {(Object.keys(STATUS_TOKENS) as GateStatus[]).map((status) => {
          const tok = STATUS_TOKENS[status];
          const count = counts[status];
          if (count === 0) return null;
          const Icon = tok.Icon;
          return (
            <span
              key={status}
              className="inline-flex items-center gap-[4px] text-[10px] uppercase tracking-wide px-[6px] py-[2px] rounded-[4px]"
              style={{ backgroundColor: tok.bg, color: tok.fg }}
            >
              <Icon size={10} aria-hidden="true" />
              {tok.label} {count}
            </span>
          );
        })}
      </div>
      {/* Per-gate list */}
      {list.length === 0 ? (
        <div className="text-[11px] text-[#acacac] mt-[8px]">No gates defined for this board.</div>
      ) : (
        <ul className="mt-[8px] divide-y divide-[#f0f0ec] border-t border-[#f0f0ec]">
          {list.map((g) => {
            const tok = STATUS_TOKENS[g.status];
            return (
              <li key={g.id} className="py-[6px] flex items-center gap-[8px] text-[12px] text-[#1a1a1a]">
                <span className="font-medium truncate">{g.name}</span>
                {g.gate_type ? (
                  <span className="text-[10px] uppercase tracking-wide text-[#6b6b6b] bg-[#f7f7f4] px-[5px] py-[1px] rounded-[3px]">
                    {g.gate_type}
                  </span>
                ) : null}
                <span
                  className="ml-auto text-[10px] uppercase tracking-wide px-[5px] py-[1px] rounded-[3px]"
                  style={{ backgroundColor: tok.bg, color: tok.fg }}
                >
                  {tok.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      </BlockLockChrome>
    </NodeViewWrapper>
  );
}

export const GatesRollupBlockView = memo(GatesRollupBlockViewImpl);
export default GatesRollupBlockView;
