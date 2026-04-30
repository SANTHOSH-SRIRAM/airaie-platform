import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2, AlertCircle, LayoutGrid } from 'lucide-react';
import { useCards } from '@hooks/useBoards';
import { useBoardModeRules } from '@hooks/useBoardModeRules';
import { useBoardCanvasContext } from '@/editor/boardCanvasContext';
import { BlockLockChrome } from '@components/cards/primitives';
import type { Card } from '@/types/card';

// ---------------------------------------------------------------------------
// CardsGridBlockView — Wave 10-05b NodeView for the `cardsGridBlock` Tiptap
// node. Renders a grid of cards belonging to the active board, optionally
// filtered by intent_type. Click-through navigates to /cards/:id.
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  draft: { bg: '#f0f0ec', fg: '#6b6b6b' },
  ready: { bg: '#e3f2fd', fg: '#1565c0' },
  queued: { bg: '#fff8e1', fg: '#ef6c00' },
  running: { bg: '#fff8e1', fg: '#ef6c00' },
  completed: { bg: '#e8f5e9', fg: '#2e7d32' },
  failed: { bg: '#ffebee', fg: '#c62828' },
  blocked: { bg: '#ffebee', fg: '#c62828' },
  skipped: { bg: '#f0f0ec', fg: '#6b6b6b' },
};

function statusTokens(status: string): { bg: string; fg: string } {
  return STATUS_COLORS[status] ?? STATUS_COLORS.draft;
}

function CardsGridBlockViewImpl({ node }: NodeViewProps) {
  const filter = (node.attrs as { filter: string | null }).filter ?? null;
  const ctx = useBoardCanvasContext();
  const { data: cards, isLoading, error } = useCards(ctx.boardId ?? '');
  const modeRules = useBoardModeRules(ctx.board ?? undefined);
  const locked = !modeRules.canEditBlocks;

  // Empty — no boardId in context (mounted outside BoardCanvasPage).
  if (!ctx.boardId) {
    return (
      <NodeViewWrapper
        data-block-type="cardsGridBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <LayoutGrid size={14} className="text-[#acacac]" aria-hidden="true" />
          <span className="font-semibold">Cards Grid</span>
          <span className="text-[#acacac]">— no board context</span>
        </div>
      </NodeViewWrapper>
    );
  }

  if (isLoading) {
    return (
      <NodeViewWrapper
        data-block-type="cardsGridBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="status">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          Loading cards…
        </div>
      </NodeViewWrapper>
    );
  }

  if (error) {
    return (
      <NodeViewWrapper
        data-block-type="cardsGridBlock"
        className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span>Could not load cards for board <code className="font-mono">{ctx.boardId}</code>.</span>
        </div>
      </NodeViewWrapper>
    );
  }

  const visibleCards: Card[] = (cards ?? []).filter((c) =>
    filter ? c.intent_type === filter : true,
  );

  if (visibleCards.length === 0) {
    return (
      <NodeViewWrapper
        data-block-type="cardsGridBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <LayoutGrid size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
          <span className="font-semibold">Cards Grid</span>
          {filter ? (
            <span className="text-[10px] uppercase tracking-wide text-[#6b6b6b] bg-[#f0f0ec] px-[6px] py-[1px] rounded-[4px]">
              {filter}
            </span>
          ) : null}
        </div>
        <div className="text-[11px] text-[#acacac] mt-[6px]">
          {filter ? `No cards with intent_type "${filter}".` : 'This board has no cards yet.'}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      data-block-type="cardsGridBlock"
      className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
      contentEditable={false}
    >
      <BlockLockChrome locked={locked} reason={modeRules.lockReason}>
      <div className="flex items-center gap-[8px]">
        <LayoutGrid size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[#1a1a1a]">Cards Grid</span>
        {filter ? (
          <span className="text-[10px] uppercase tracking-wide text-[#6b6b6b] bg-[#f0f0ec] px-[6px] py-[1px] rounded-[4px]">
            filter: {filter}
          </span>
        ) : null}
        <span className="ml-auto text-[10px] text-[#6b6b6b]">{visibleCards.length} card{visibleCards.length === 1 ? '' : 's'}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[8px] mt-[8px]">
        {visibleCards.map((card) => {
          const tokens = statusTokens(card.status ?? 'draft');
          return (
            <a
              key={card.id}
              href={`/cards/${card.id}`}
              className="block border border-[#eee] rounded-[8px] p-[8px] no-underline hover:bg-[#fafaf7]"
            >
              <div className="text-[12px] font-semibold text-[#1a1a1a] truncate">
                {card.title || 'Untitled card'}
              </div>
              <div className="flex items-center gap-[6px] mt-[4px]">
                {card.intent_type ? (
                  <span className="text-[10px] uppercase tracking-wide text-[#6b6b6b] bg-[#f7f7f4] px-[5px] py-[1px] rounded-[3px]">
                    {card.intent_type}
                  </span>
                ) : null}
                <span
                  className="ml-auto text-[10px] uppercase tracking-wide px-[5px] py-[1px] rounded-[3px]"
                  style={{ backgroundColor: tokens.bg, color: tokens.fg }}
                >
                  {card.status ?? 'draft'}
                </span>
              </div>
            </a>
          );
        })}
      </div>
      </BlockLockChrome>
    </NodeViewWrapper>
  );
}

export const CardsGridBlockView = memo(CardsGridBlockViewImpl);
export default CardsGridBlockView;
