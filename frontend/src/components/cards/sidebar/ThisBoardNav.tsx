// Placeholder for Task 7 — replaced with the full implementation in 08-01-T-07.
// Keeps the type/import surface stable so CardDetailSidebar compiles.

interface ThisBoardNavProps {
  boardId: string;
  currentCardId?: string;
}

export default function ThisBoardNav(_props: ThisBoardNavProps) {
  return (
    <div className="text-[10px] text-[#acacac]">
      ThisBoardNav (placeholder — Task 7)
    </div>
  );
}
