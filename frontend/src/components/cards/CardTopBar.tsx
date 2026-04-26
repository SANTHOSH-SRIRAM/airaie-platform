// Placeholder for Task 5 — replaced with the full Run state-machine
// implementation in 08-01-T-05. Keeping this minimal stub here lets Task 3's
// CardDetailPage compile and render before the top bar is implemented.

import type { Card } from '@/types/card';
import type { Board } from '@/types/board';

interface CardTopBarProps {
  card: Card;
  board?: Board;
  boardLoading?: boolean;
}

export default function CardTopBar({ card }: CardTopBarProps) {
  return (
    <div className="h-[56px] bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] flex items-center px-[16px]">
      <span className="text-[13px] font-semibold text-[#1a1a1a]">{card.title}</span>
      <span className="ml-auto text-[10px] text-[#acacac]">CardTopBar (placeholder — Task 5)</span>
    </div>
  );
}
