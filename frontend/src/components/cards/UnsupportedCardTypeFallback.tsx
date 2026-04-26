import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Card, CardType } from '@/types/card';

// ---------------------------------------------------------------------------
// UnsupportedCardTypeFallback — graceful fallback for non-`analysis` Cards.
//
// Phase 8 only ships the Card-page UI for `analysis` Cards. Other types
// (`comparison`, `sweep`, `agent`, `gate`, `milestone`) keep the legacy
// side-sheet behavior on the Board route. When the user navigates to
// `/cards/{id}` for one of these types, we render this friendly fallback
// with a deep link to `/boards/{boardId}?legacy=1&cardId={id}` so the
// existing side-sheet still works — Wave 1 preserved that path explicitly.
//
// CardDetailPage short-circuits to this component when `card.card_type !==
// 'analysis'`. The check happens after the Card itself loads but before any
// body sections mount, so we don't waste fetches on artifacts/pipelines/
// runs that the unsupported type doesn't use.
// ---------------------------------------------------------------------------

const TYPE_EMOJI: Record<CardType, string> = {
  analysis: '🎯',
  comparison: '⚖️',
  sweep: '🔭',
  agent: '🤖',
  gate: '🚦',
  milestone: '🏁',
};

const TYPE_LABEL: Record<CardType, string> = {
  analysis: 'Analysis',
  comparison: 'Comparison',
  sweep: 'Sweep',
  agent: 'Agent',
  gate: 'Gate',
  milestone: 'Milestone',
};

interface UnsupportedCardTypeFallbackProps {
  card: Card;
}

export default function UnsupportedCardTypeFallback({
  card,
}: UnsupportedCardTypeFallbackProps) {
  const navigate = useNavigate();
  const emoji = TYPE_EMOJI[card.card_type] ?? '🃏';
  const label = TYPE_LABEL[card.card_type] ?? card.card_type;

  // Build the legacy URL with both `legacy=1` (preserves side-sheet) and
  // `cardId=...` (BoardDetailPage may auto-select via this query param).
  // The cardId param is best-effort; if BoardDetailPage doesn't yet read
  // it, the user simply lands on the Board with the side-sheet enabled.
  const legacyHref = `/boards/${card.board_id}?legacy=1&cardId=${card.id}`;

  const handleOpen = () => {
    navigate(legacyHref);
  };

  return (
    <div
      role="region"
      aria-label="Unsupported card type"
      className="mx-auto w-full max-w-[640px] mt-[64px] flex flex-col items-center text-center px-[24px]"
    >
      <span
        className="text-[64px] leading-none mb-[16px]"
        aria-hidden="true"
      >
        {emoji}
      </span>
      <h2 className="text-[20px] font-bold text-[#1a1a1a] mb-[8px]">
        {label} Cards are coming soon
      </h2>
      <p className="text-[13px] text-[#6b6b6b] leading-[1.6] mb-[24px]">
        This card type is configured but not yet supported on the new
        Card-as-page UI. The current page renders only{' '}
        <code className="text-[#1a1a1a] bg-[#f0f0ec] px-[6px] py-[1px] rounded">
          analysis
        </code>{' '}
        Cards. View this {label.toLowerCase()} Card in legacy mode to interact
        with it from the Board side-sheet.
      </p>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Open ${card.title} in legacy mode`}
        className="inline-flex items-center gap-[6px] h-[40px] px-[16px] rounded-[8px] bg-[#1a1a1a] text-white text-[12px] font-semibold hover:bg-[#2d2d2d] transition-colors"
      >
        Open in legacy mode
        <ArrowRight size={14} aria-hidden="true" />
      </button>
      <p className="text-[10px] text-[#acacac] mt-[12px]">
        Card type: <code>{card.card_type}</code>
        <span className="mx-[4px]">·</span>
        Card id: <code>{card.id.slice(0, 12)}</code>
      </p>
    </div>
  );
}
