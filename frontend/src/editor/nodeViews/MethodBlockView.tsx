import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2, AlertCircle, Settings2, Cog } from 'lucide-react';
import { useCardCanvasContext } from '@/editor/cardCanvasContext';
import { usePlan, useGeneratePlan } from '@hooks/usePlans';
import { formatPlanSummary } from './MethodBlockView.helpers';

// ---------------------------------------------------------------------------
// MethodBlockView — Wave 10-03 NodeView for the `methodBlock` Tiptap node.
//
// Contract: fetches via `usePlan(cardCanvasContext.cardId)` — NOT via the
// node's planId attr. The hook's signature accepts a CARD ID (verified at
// frontend/src/hooks/usePlans.ts:30). The node's planId attr is preserved
// for serialization stability (the canvas doc body remembers which plan
// revision was pinned at insertion time) but is NEVER the fetch key.
//
// Empty state: a "Generate Plan" button calling
// `useGeneratePlan(cardId).mutate()` — same vocabulary as the
// CardActionBar's no-plan stage.
// ---------------------------------------------------------------------------

function MethodBlockViewImpl(_props: NodeViewProps) {
  const { cardId } = useCardCanvasContext();
  const { data: plan, isLoading, error } = usePlan(cardId ?? undefined);
  const generatePlan = useGeneratePlan(cardId ?? '');

  const wrapperBase = 'my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]';

  // No card context — degraded display (NodeView mounted outside Provider).
  if (!cardId) {
    return (
      <NodeViewWrapper data-block-type="methodBlock" className={wrapperBase} contentEditable={false}>
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <Cog size={14} className="text-[#1976d2]" aria-hidden="true" />
          <span className="font-semibold">Method</span>
          <span className="text-[#acacac]">— unavailable outside a Card context</span>
        </div>
      </NodeViewWrapper>
    );
  }

  // Loading.
  if (isLoading) {
    return (
      <NodeViewWrapper data-block-type="methodBlock" className={wrapperBase} contentEditable={false}>
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="status">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          Loading method…
        </div>
      </NodeViewWrapper>
    );
  }

  // Error (hard fetch error — distinct from "no plan exists yet" which is a 404 → null).
  if (error) {
    return (
      <NodeViewWrapper
        data-block-type="methodBlock"
        className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span>Could not load method.</span>
        </div>
      </NodeViewWrapper>
    );
  }

  // No plan yet — Generate Plan button.
  if (!plan) {
    return (
      <NodeViewWrapper data-block-type="methodBlock" className={wrapperBase} contentEditable={false}>
        <div className="flex items-center gap-[8px]">
          <Cog size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
          <span className="text-[12px] font-semibold text-[#1a1a1a]">Method</span>
          <span className="text-[11px] text-[#acacac]">— no plan generated yet</span>
        </div>
        <button
          type="button"
          className="mt-[8px] inline-flex items-center gap-[6px] px-[10px] py-[6px] rounded-[6px] bg-[#1a1a1a] text-white text-[11px] font-semibold hover:bg-[#2d2d2d] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => generatePlan.mutate()}
          disabled={generatePlan.isPending}
        >
          {generatePlan.isPending ? (
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          ) : (
            <Settings2 size={12} aria-hidden="true" />
          )}
          {generatePlan.isPending ? 'Generating…' : 'Generate Plan'}
        </button>
        {generatePlan.isError ? (
          <div className="mt-[6px] text-[10px] text-[#c62828]" role="alert">
            Plan generation failed. Try again.
          </div>
        ) : null}
      </NodeViewWrapper>
    );
  }

  // Loaded.
  const summary = formatPlanSummary(plan);
  if (!summary) {
    // Defensive — should be unreachable given `if (!plan)` branch above.
    return null;
  }

  return (
    <NodeViewWrapper data-block-type="methodBlock" className={wrapperBase} contentEditable={false}>
      <div className="flex items-center gap-[8px]">
        <Cog size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[#1a1a1a]">Method</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-[#6b6b6b] bg-[#f0f0ec] px-[6px] py-[1px] rounded-[4px]">
          {summary.status}
        </span>
      </div>
      <div className="text-[12px] text-[#1a1a1a] mt-[6px] leading-[1.5]">
        <span className="font-mono">{summary.pipelineId || '(no pipeline)'}</span>
        <span className="text-[#6b6b6b]">
          {' '}· {summary.stepCount} step{summary.stepCount === 1 ? '' : 's'}
        </span>
      </div>
      {plan.nodes && plan.nodes.length > 0 ? (
        <div className="text-[10px] text-[#6b6b6b] mt-[4px] truncate">
          {plan.nodes.map((n) => n.tool_id).join(' → ')}
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

export const MethodBlockView = memo(MethodBlockViewImpl);
export default MethodBlockView;
