import { lazy, memo, Suspense } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Network } from 'lucide-react';
import { useBoardCanvasContext } from '@/editor/boardCanvasContext';
import { useBoardModeRules } from '@hooks/useBoardModeRules';
import { BlockLockChrome } from '@components/cards/primitives';
import LazyMount from './LazyMount';

// Lazy-import the dependency graph so xyflow's bytes only ship when a board
// actually mounts a CardsGraph block (and per LazyMount, only when the block
// is in the viewport).
const CardDependencyGraph = lazy(
  () => import('@components/boards/cards/CardDependencyGraph'),
);

// ---------------------------------------------------------------------------
// CardsGraphBlockView — Wave 10-05c-rest NodeView for the `cardsGraphBlock`
// Tiptap node. Reuses the existing `<CardDependencyGraph>` (xyflow-based DAG
// view used by Phase 8's BoardDetailPage) wrapped in NodeView chrome. Inside
// a Tiptap `atom: true` block the graph is rendered read-only — no node
// drag, no edge editing — which matches the read-only board-canvas usage.
// ---------------------------------------------------------------------------

function CardsGraphBlockViewImpl(_props: NodeViewProps) {
  const ctx = useBoardCanvasContext();
  const modeRules = useBoardModeRules(ctx.board ?? undefined);
  const locked = !modeRules.canEditBlocks;

  if (!ctx.boardId) {
    return (
      <NodeViewWrapper
        data-block-type="cardsGraphBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <Network size={14} className="text-[#acacac]" aria-hidden="true" />
          <span className="font-semibold">Cards Graph</span>
          <span className="text-[#acacac]">— no board context</span>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      data-block-type="cardsGraphBlock"
      className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
      contentEditable={false}
    >
      <BlockLockChrome locked={locked} reason={modeRules.lockReason}>
        <div className="flex items-center gap-[8px] mb-[8px]">
          <Network size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
          <span className="text-[12px] font-semibold text-[#1a1a1a]">Cards Graph</span>
          <span className="ml-auto text-[10px] text-[#6b6b6b]">dependency DAG</span>
        </div>
        <LazyMount placeholderHeight={320} label="Loading dependency graph…">
          <Suspense
            fallback={
              <div className="flex h-[320px] items-center justify-center rounded-[8px] bg-[#fafaf7] text-[12px] text-[#9b978f]">
                Loading dependency graph…
              </div>
            }
          >
            <CardDependencyGraph boardId={ctx.boardId} />
          </Suspense>
        </LazyMount>
      </BlockLockChrome>
    </NodeViewWrapper>
  );
}

export const CardsGraphBlockView = memo(CardsGraphBlockViewImpl);
export default CardsGraphBlockView;
