import { memo, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2, AlertCircle, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useGate, useApproveGate, useRejectGate } from '@hooks/useGates';
import { useCardCanvasContext } from '@/editor/cardCanvasContext';
import { formatGateBadge, canSignOffGate, badgeColorTokens } from './GateBlockView.helpers';

// ---------------------------------------------------------------------------
// GateBlockView — Wave 10-04 NodeView for the `gateBlock` Tiptap node.
//
// Reads `attrs.gateId`, fetches the bound Gate via `useGate(gateId)`, renders
// the gate's name + status badge. When the gate is PENDING and the user can
// sign off, the chrome shows Approve / Reject buttons that invoke the
// existing kernel mutations. Mode-rule per-block locks (the role/Mode gating
// that determines whether sign-off is allowed) ship in 10-06.
// ---------------------------------------------------------------------------

function GateBlockViewImpl({ node }: NodeViewProps) {
  const gateId = (node.attrs as { gateId: string | null }).gateId;
  const ctx = useCardCanvasContext();
  const { data: gate, isLoading, error } = useGate(gateId ?? undefined);
  const approve = useApproveGate(gateId ?? '', ctx.boardId ?? undefined);
  const reject = useRejectGate(gateId ?? '', ctx.boardId ?? undefined);
  const [actionError, setActionError] = useState<string | null>(null);

  // Empty.
  if (!gateId) {
    return (
      <NodeViewWrapper
        data-block-type="gateBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <ShieldCheck size={14} className="text-[#acacac]" aria-hidden="true" />
          <span className="font-semibold">Gate</span>
          <span className="text-[#acacac]">— not linked</span>
        </div>
      </NodeViewWrapper>
    );
  }

  // Loading.
  if (isLoading) {
    return (
      <NodeViewWrapper
        data-block-type="gateBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="status">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          Loading gate…
        </div>
      </NodeViewWrapper>
    );
  }

  // Error / not found.
  if (error || !gate) {
    return (
      <NodeViewWrapper
        data-block-type="gateBlock"
        className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span>
            Could not load gate <code className="font-mono">{gateId}</code>.
          </span>
        </div>
      </NodeViewWrapper>
    );
  }

  // Loaded.
  const badge = formatGateBadge(gate);
  const tokens = badgeColorTokens(badge.color);
  const showSignOff = canSignOffGate(gate);

  const handleApprove = async () => {
    setActionError(null);
    try {
      await approve.mutateAsync({ rationale: 'Approved via canvas', role: 'reviewer' });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Approve failed');
    }
  };

  const handleReject = async () => {
    setActionError(null);
    try {
      await reject.mutateAsync({ rationale: 'Rejected via canvas', role: 'reviewer' });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Reject failed');
    }
  };

  return (
    <NodeViewWrapper
      data-block-type="gateBlock"
      className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
      contentEditable={false}
    >
      <div className="flex items-center gap-[8px]">
        <ShieldCheck size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[#1a1a1a]">Gate</span>
        <span className="text-[12px] text-[#1a1a1a]">· {gate.name}</span>
        <span
          className="ml-auto text-[10px] uppercase tracking-wide px-[6px] py-[1px] rounded-[4px]"
          style={{ backgroundColor: tokens.bg, color: tokens.fg }}
        >
          {badge.label}
        </span>
      </div>
      {gate.description ? (
        <div className="text-[11px] text-[#6b6b6b] mt-[4px]">{gate.description}</div>
      ) : null}
      {showSignOff ? (
        <div className="flex items-center gap-[8px] mt-[8px]">
          <button
            type="button"
            onClick={handleApprove}
            disabled={approve.isPending}
            className="inline-flex items-center gap-[4px] text-[11px] px-[10px] py-[4px] rounded-[6px] bg-[#2e7d32] text-white disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 size={12} />
            {approve.isPending ? 'Approving…' : 'Approve'}
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={reject.isPending}
            className="inline-flex items-center gap-[4px] text-[11px] px-[10px] py-[4px] rounded-[6px] bg-[#c62828] text-white disabled:opacity-50 cursor-pointer"
          >
            <XCircle size={12} />
            {reject.isPending ? 'Rejecting…' : 'Reject'}
          </button>
          {actionError ? (
            <span className="text-[10px] text-[#c62828]">{actionError}</span>
          ) : null}
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

export const GateBlockView = memo(GateBlockViewImpl);
export default GateBlockView;
