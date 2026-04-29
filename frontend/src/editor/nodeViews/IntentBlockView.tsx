import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2, AlertCircle, Target } from 'lucide-react';
import { useIntent } from '@hooks/useIntents';
import { useFeatureFlagPhase11A } from '@hooks/useFeatureFlags';
import { StagePanel } from '@/components/cards/primitives';
import { formatIntentSummary, formatIntentStatus } from './IntentBlockView.helpers';

// ---------------------------------------------------------------------------
// IntentBlockView — Wave 10-02 NodeView for the `intentBlock` Tiptap node.
//
// Reads `attrs.intentSpecId`, calls `useIntent(id)`, renders the bound
// IntentSpec. Empty state when intentSpecId is null (Card has no Intent yet)
// — invites the user to use the existing structured-page Intent flow. The
// inline picker that creates IntentSpecs from inside the canvas lands in a
// later wave (10-03+); this wave keeps the surface small.
//
// The outer chrome mirrors TypedBlockPlaceholder so visual rhythm of the
// canvas stays consistent across mixed (real + placeholder) blocks while
// 10-03/10-04 land the remaining NodeViews.
// ---------------------------------------------------------------------------

function IntentBlockViewImpl({ node }: NodeViewProps) {
  // Hooks first — must be called unconditionally on every render (rules of hooks).
  const phase11 = useFeatureFlagPhase11A();
  const intentSpecId = (node.attrs as { intentSpecId: string | null }).intentSpecId;
  const { data: intent, isLoading, error } = useIntent(intentSpecId ?? undefined);

  // Empty — no intent bound.
  if (!intentSpecId) {
    return (
      <NodeViewWrapper
        data-block-type="intentBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <Target size={14} className="text-[#1976d2]" aria-hidden="true" />
          <span className="font-semibold">Intent</span>
          <span className="text-[#acacac]">— not yet set</span>
        </div>
        <div className="text-[11px] text-[#acacac] mt-[4px]">
          Use the structured page to create an Intent for this Card. Inline picker arrives in a later wave.
        </div>
      </NodeViewWrapper>
    );
  }

  // Loading.
  if (isLoading) {
    return (
      <NodeViewWrapper
        data-block-type="intentBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="status">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          Loading intent…
        </div>
      </NodeViewWrapper>
    );
  }

  // Error.
  if (error || !intent) {
    return (
      <NodeViewWrapper
        data-block-type="intentBlock"
        className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span>
            Could not load intent <code className="font-mono">{intentSpecId}</code>.
          </span>
        </div>
      </NodeViewWrapper>
    );
  }

  // Loaded.
  const status = formatIntentStatus(intent);

  // Phase 11 Wave A — StagePanel-based layout. Gated behind ?phase11=A.
  if (phase11) {
    return (
      <NodeViewWrapper data-block-type="intentBlock" contentEditable={false}>
        <StagePanel
          number={1}
          title="Intent Definition"
          status={status?.label}
          statusTone="neutral"
        >
          <div className="flex flex-col gap-[8px]">
            <span className="font-sans text-[12px] font-medium text-[#554433]">
              Core Objective
            </span>
            <p className="rounded-[12px] bg-[#f5f5f0] px-[16px] py-[16px] font-sans text-[14px] leading-[1.55] text-[#554433]">
              {formatIntentSummary(intent)}
            </p>
          </div>
        </StagePanel>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      data-block-type="intentBlock"
      className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
      contentEditable={false}
    >
      <div className="flex items-center gap-[8px]">
        <Target size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[#1a1a1a]">Intent</span>
        {status ? (
          <span className="ml-auto text-[10px] uppercase tracking-wide text-[#6b6b6b] bg-[#f0f0ec] px-[6px] py-[1px] rounded-[4px]">
            {status.label}
          </span>
        ) : null}
      </div>
      <div className="text-[12px] text-[#1a1a1a] mt-[6px] leading-[1.5]">
        {formatIntentSummary(intent)}
      </div>
    </NodeViewWrapper>
  );
}

export const IntentBlockView = memo(IntentBlockViewImpl);
export default IntentBlockView;
