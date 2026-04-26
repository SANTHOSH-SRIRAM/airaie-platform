import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import { cn } from '@utils/cn';
import { useCardList } from '@hooks/useCards';
import { useBoard } from '@hooks/useBoards';
import { cardDetailPath } from '@constants/routes';
import type { Card, CardStatus } from '@/types/card';

// ---------------------------------------------------------------------------
// Status dot palette — single-source-of-truth for the small 8px dots used
// across the per-card sidebar. Mirrors CardList.tsx STATUS_CONFIG but with
// dot-only output (no labels) since the row is space-constrained.
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<CardStatus, string> = {
  draft: 'bg-[#9e9e9e]',
  ready: 'bg-[#2196f3]',
  queued: 'bg-[#ff9800]',
  running: 'bg-[#2196f3] animate-pulse',
  completed: 'bg-[#4caf50]',
  failed: 'bg-[#e74c3c]',
  blocked: 'bg-[#ff9800]',
  skipped: 'bg-[#9e9e9e] opacity-50',
};

// ---------------------------------------------------------------------------
// orderCards — pure helper (exported for unit tests). Stable sort by
// `ordinal` ascending; ties broken by `created_at` ascending so the order
// matches the Board's Cards-tab listing.
// ---------------------------------------------------------------------------

export function orderCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.ordinal !== b.ordinal) return a.ordinal - b.ordinal;
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return ta - tb;
  });
}

// ---------------------------------------------------------------------------
// ThisBoardNav — sidebar context block listing the cards in the current
// Board, with the active card highlighted. Mounted by CardDetailSidebar
// while on the `/cards/:cardId` route.
// ---------------------------------------------------------------------------

interface ThisBoardNavProps {
  boardId: string;
  currentCardId?: string;
}

export default function ThisBoardNav({ boardId, currentCardId }: ThisBoardNavProps) {
  const navigate = useNavigate();
  const { data: board } = useBoard(boardId);
  const { data: cards, isLoading, error } = useCardList(boardId);

  const ordered = cards ? orderCards(cards) : [];

  return (
    <div className="flex flex-col gap-[8px]">
      {/* Section header */}
      <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px] px-[4px]">
        This Board
      </span>

      {/* Board parent row — click navigates back to /boards/:boardId */}
      <button
        type="button"
        onClick={() => navigate(`/boards/${boardId}`)}
        aria-label={`Open ${board?.name ?? 'Board'}`}
        className="flex items-center gap-[8px] px-[8px] py-[8px] rounded-[8px] hover:bg-[#f0f0ec] transition-colors text-left"
      >
        <span className="text-[14px] leading-none">▣</span>
        <span className="text-[12px] font-medium text-[#1a1a1a] truncate flex-1">
          {board?.name ?? 'Board'}
        </span>
      </button>

      {/* Loading / error / empty / list */}
      {isLoading && (
        <div className="flex items-center gap-[6px] px-[8px] py-[6px]">
          <Loader2 size={12} className="animate-spin text-[#acacac]" />
          <span className="text-[10px] text-[#acacac]">Loading…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-[6px] px-[8px] py-[6px]">
          <AlertCircle size={12} className="text-[#e74c3c]" />
          <span className="text-[10px] text-[#e74c3c]">Failed to load</span>
        </div>
      )}

      {!isLoading && !error && ordered.length === 0 && (
        <span className="text-[10px] text-[#acacac] px-[8px] py-[6px]">No cards yet</span>
      )}

      {/* Card list — child rows */}
      {!isLoading && !error && ordered.length > 0 && (
        <div className="flex flex-col gap-[2px]">
          {ordered.map((card) => {
            const isActive = card.id === currentCardId;
            const dot = STATUS_DOT[card.status] ?? STATUS_DOT.draft;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => navigate(cardDetailPath(card.id))}
                aria-label={`Open ${card.title}`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-[8px] pl-[12px] pr-[8px] py-[6px] rounded-[6px] transition-colors text-left group',
                  isActive
                    ? 'bg-[#f5f5f0] border-l-[2px] border-[#ff9800] -ml-[2px]'
                    : 'hover:bg-[#fafafa]',
                )}
              >
                {/* Active indicator (▶) vs idle (◯) */}
                <span
                  className={cn(
                    'text-[9px] leading-none w-[10px] inline-flex items-center justify-center',
                    isActive ? 'text-[#ff9800]' : 'text-[#d0d0d0]',
                  )}
                  aria-hidden="true"
                >
                  {isActive ? '▶' : '◯'}
                </span>

                {/* Status dot */}
                <span className={cn('w-[6px] h-[6px] rounded-full shrink-0', dot)} />

                {/* Title */}
                <span
                  className={cn(
                    'text-[11px] truncate flex-1',
                    isActive ? 'text-[#1a1a1a] font-semibold' : 'text-[#6b6b6b]',
                  )}
                >
                  {card.title}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* + New card — opens the existing Create Card flow on the Board route */}
      <button
        type="button"
        onClick={() => navigate(`/boards/${boardId}?new=card`)}
        className="flex items-center gap-[6px] px-[8px] py-[6px] rounded-[6px] hover:bg-[#fff3e0] transition-colors text-left text-[#ff9800]"
        aria-label="Create new card"
      >
        <Plus size={11} strokeWidth={2.5} />
        <span className="text-[10px] font-medium">New card</span>
      </button>
    </div>
  );
}
