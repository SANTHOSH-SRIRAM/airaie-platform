import { cn } from '@utils/cn';
import { useCardList } from '@hooks/useCards';
import type { Card, CardStatus } from '@/types/card';
import { AlertCircle, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  CardStatus,
  { label: string; dot: string; text: string }
> = {
  draft: { label: 'Draft', dot: 'bg-[#9e9e9e]', text: 'text-[#9e9e9e]' },
  ready: { label: 'Ready', dot: 'bg-[#2196f3]', text: 'text-[#2196f3]' },
  queued: { label: 'Queued', dot: 'bg-[#ff9800]', text: 'text-[#ff9800]' },
  running: { label: 'Running', dot: 'bg-[#2196f3] animate-pulse', text: 'text-[#2196f3]' },
  completed: { label: 'Completed', dot: 'bg-[#4caf50]', text: 'text-[#4caf50]' },
  failed: { label: 'Failed', dot: 'bg-[#e74c3c]', text: 'text-[#e74c3c]' },
  blocked: { label: 'Blocked', dot: 'bg-[#ff9800]', text: 'text-[#ff9800]' },
  skipped: { label: 'Skipped', dot: 'bg-[#9e9e9e] opacity-50', text: 'text-[#9e9e9e]' },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  analysis: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
  comparison: { bg: 'bg-[#f3e5f5]', text: 'text-[#9c27b0]' },
  sweep: { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
  agent: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
  gate: { bg: 'bg-[#fce4ec]', text: 'text-[#e91e63]' },
  milestone: { bg: 'bg-[#e0f2f1]', text: 'text-[#009688]' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CardListProps {
  boardId: string;
  onSelectCard?: (cardId: string) => void;
}

export default function CardList({ boardId, onSelectCard }: CardListProps) {
  const { data: cards, isLoading, error } = useCardList(boardId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-[40px]">
        <Loader2 size={20} className="animate-spin text-[#acacac]" />
        <span className="ml-[8px] text-[12px] text-[#acacac]">Loading cards...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-[40px] gap-[8px]">
        <AlertCircle size={16} className="text-[#e74c3c]" />
        <span className="text-[12px] text-[#e74c3c]">Failed to load cards</span>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-[40px]">
        <div className="w-[48px] h-[48px] rounded-[12px] bg-[#f0f0ec] flex items-center justify-center mb-[12px]">
          <AlertCircle size={20} className="text-[#acacac]" />
        </div>
        <p className="text-[13px] font-medium text-[#1a1a1a]">No cards yet</p>
        <p className="text-[11px] text-[#acacac] mt-[4px]">
          Add your first analysis card to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {cards.map((card) => (
        <CardRow key={card.id} card={card} onClick={() => onSelectCard?.(card.id)} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card row
// ---------------------------------------------------------------------------

function CardRow({ card, onClick }: { card: Card; onClick: () => void }) {
  const status = STATUS_CONFIG[card.status] ?? STATUS_CONFIG.draft;
  const typeStyle = TYPE_COLORS[card.card_type] ?? { bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]' };

  const passCount = card.kpis.length; // total KPIs
  // We cannot know actuals from card alone; show total KPI count
  const kpiLabel = passCount > 0 ? `${passCount} KPIs` : 'No KPIs';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-[10px] p-[12px] rounded-[10px] border border-[#e8e8e8] hover:border-[#d0d0d0] hover:bg-[#fafafa] transition-colors cursor-pointer"
    >
      {/* Status dot */}
      <span className={cn('w-[8px] h-[8px] rounded-full shrink-0', status.dot)} />

      {/* Title + info */}
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-medium text-[#1a1a1a] block truncate">
          {card.title}
        </span>
        <span className="text-[10px] text-[#acacac] block mt-[2px]">
          {card.intent_type ?? 'No intent'} {kpiLabel ? ` \u00B7 ${kpiLabel}` : ''}
        </span>
      </div>

      {/* Card type badge */}
      <span
        className={cn(
          'h-[20px] px-[8px] rounded-[4px] text-[10px] font-medium inline-flex items-center capitalize shrink-0',
          typeStyle.bg,
          typeStyle.text,
        )}
      >
        {card.card_type}
      </span>

      {/* Status label */}
      <span className={cn('text-[10px] font-medium shrink-0', status.text)}>
        {status.label}
      </span>
    </button>
  );
}
