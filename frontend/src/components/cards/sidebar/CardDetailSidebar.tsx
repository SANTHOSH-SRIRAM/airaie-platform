import { useParams } from 'react-router-dom';
import { useCard } from '@hooks/useCards';
import ThisBoardNav from './ThisBoardNav';
import ThisCardStatusPill from './ThisCardStatusPill';

/**
 * CardDetailSidebar — sidebar context shown while on `/cards/:cardId`.
 *
 * Reads `cardId` from the route via `useParams` (the SidebarContentRouter
 * lives inside the BrowserRouter, so route params are available). Mounts
 * two contextual blocks:
 *   - <ThisBoardNav> — sibling cards in the current Board
 *   - <ThisCardStatusPill> — live status / mode / counts pill
 *
 * Wave 1 (08-01) ships both blocks. Future waves may compose more blocks
 * (related cards, artifacts shortcuts) here.
 */
export default function CardDetailSidebar() {
  const { cardId } = useParams<{ cardId: string }>();
  const { data: card } = useCard(cardId);

  if (!cardId || !card) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <ThisBoardNav boardId={card.board_id} currentCardId={cardId} />
      <ThisCardStatusPill cardId={cardId} />
    </div>
  );
}
