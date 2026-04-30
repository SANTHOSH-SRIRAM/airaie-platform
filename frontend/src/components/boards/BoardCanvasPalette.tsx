import { memo, useState } from 'react';
import { LayoutGrid, Package } from 'lucide-react';
import { useCards } from '@hooks/useBoards';
import { useArtifactList } from '@hooks/useArtifacts';
import type { Card } from '@/types/card';
import type { BoardArtifact } from '@api/artifacts';

// ---------------------------------------------------------------------------
// BoardCanvasPalette — right-side palette that drag-sources cards + artifacts
// onto the BoardCanvasPage's Tiptap editor (Phase 10 polish, task #20).
//
// Two sections (Cards, Artifacts). Each tile is a draggable HTML5 element
// that sets `application/x-airaie-drop` payload on `dragstart`. The drop
// handler in BoardCanvasPage reads the payload and inserts the matching
// block via Tiptap's `insertContentAt`.
//
// v1 drop mappings (per .planning/research/board-canvas-drag-drop-2026-04-30.md):
//   Card → cardsGridBlock with attrs.filter = card.intent_type
//   Artifact → artifactPoolBlock (unfiltered for v1)
//
// `disabled` (when board.mode !== 'explore') greys the tiles + sets
// `draggable=false`. Mirrors the lock chrome on the canvas itself.
// ---------------------------------------------------------------------------

export interface DropPayloadCard {
  kind: 'card';
  cardId: string;
  intentType: string | null;
  title: string;
}
export interface DropPayloadArtifact {
  kind: 'artifact';
  artifactId: string;
  type: string;
  name: string | null;
}
export type DropPayload = DropPayloadCard | DropPayloadArtifact;

export const DROP_MIME = 'application/x-airaie-drop';

interface BoardCanvasPaletteProps {
  open: boolean;
  boardId: string | undefined;
  disabled?: boolean;
  disabledReason?: string | null;
  onClose: () => void;
}

function CardTile({ card, disabled }: { card: Card; disabled: boolean }) {
  const onDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    const payload: DropPayloadCard = {
      kind: 'card',
      cardId: card.id,
      intentType: card.intent_type ?? null,
      title: card.title || card.id,
    };
    e.dataTransfer.setData(DROP_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };
  return (
    <button
      type="button"
      draggable={!disabled}
      onDragStart={onDragStart}
      disabled={disabled}
      className="flex flex-col gap-[4px] rounded-[8px] bg-[#f5f5f0] px-[10px] py-[8px] text-left transition-colors hover:bg-[#ebebe6] disabled:cursor-not-allowed disabled:opacity-50"
      title={
        disabled
          ? 'Locked'
          : `Drag to canvas — inserts a Cards Grid filtered to ${card.intent_type ?? 'this card'}`
      }
    >
      <span className="truncate font-sans text-[12px] font-medium text-[#1a1c19]">
        {card.title || card.id}
      </span>
      <span className="font-mono text-[10px] text-[#554433]/70">
        {card.intent_type ?? '—'}
      </span>
    </button>
  );
}

function ArtifactTile({
  artifact,
  disabled,
}: {
  artifact: BoardArtifact;
  disabled: boolean;
}) {
  const onDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    const payload: DropPayloadArtifact = {
      kind: 'artifact',
      artifactId: artifact.id,
      type: artifact.type,
      name: artifact.name ?? null,
    };
    e.dataTransfer.setData(DROP_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };
  return (
    <button
      type="button"
      draggable={!disabled}
      onDragStart={onDragStart}
      disabled={disabled}
      className="flex items-center gap-[8px] rounded-[8px] bg-[#f5f5f0] px-[10px] py-[8px] text-left transition-colors hover:bg-[#ebebe6] disabled:cursor-not-allowed disabled:opacity-50"
      title={disabled ? 'Locked' : 'Drag to canvas — inserts an Artifact Pool block'}
    >
      <span className="truncate font-sans text-[12px] font-medium text-[#1a1c19]">
        {artifact.name || artifact.id}
      </span>
      <span className="ml-auto font-mono text-[10px] uppercase text-[#554433]/70">
        {artifact.type}
      </span>
    </button>
  );
}

function BoardCanvasPaletteImpl({
  open,
  boardId,
  disabled = false,
  disabledReason,
  onClose,
}: BoardCanvasPaletteProps) {
  const { data: cards } = useCards(boardId ?? '');
  const { data: artifacts } = useArtifactList(boardId);
  const [tab, setTab] = useState<'cards' | 'artifacts'>('cards');

  if (!open) return null;
  const cardList = cards ?? [];
  const artifactList = artifacts ?? [];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/10"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label="Board canvas palette"
        className="fixed inset-y-0 right-0 z-50 flex w-[360px] max-w-full flex-col bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between gap-[8px] border-b border-[#ebebe6] px-[20px] py-[14px]">
          <span className="font-sans text-[14px] font-medium text-[#1a1c19]">
            Drag to canvas
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] p-[4px] font-mono text-[14px] text-[#554433]/60 hover:bg-[#f5f5f0]"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex border-b border-[#ebebe6]">
          <button
            type="button"
            onClick={() => setTab('cards')}
            className={`flex flex-1 items-center justify-center gap-[6px] py-[8px] font-sans text-[12px] font-medium transition-colors ${
              tab === 'cards'
                ? 'border-b-[2px] border-[#1976d2] text-[#1976d2]'
                : 'text-[#554433]/70 hover:bg-[#f5f5f0]'
            }`}
          >
            <LayoutGrid size={12} aria-hidden="true" />
            Cards
            <span className="font-mono text-[10px] text-[#554433]/55">
              {cardList.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('artifacts')}
            className={`flex flex-1 items-center justify-center gap-[6px] py-[8px] font-sans text-[12px] font-medium transition-colors ${
              tab === 'artifacts'
                ? 'border-b-[2px] border-[#1976d2] text-[#1976d2]'
                : 'text-[#554433]/70 hover:bg-[#f5f5f0]'
            }`}
          >
            <Package size={12} aria-hidden="true" />
            Artifacts
            <span className="font-mono text-[10px] text-[#554433]/55">
              {artifactList.length}
            </span>
          </button>
        </div>

        {disabled && disabledReason ? (
          <div className="border-b border-[#ebebe6] bg-[#fff7e6] px-[20px] py-[8px] font-sans text-[11px] text-[#8b5000]">
            {disabledReason}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-[20px] py-[12px]">
          {tab === 'cards' ? (
            cardList.length === 0 ? (
              <p className="py-[16px] text-center font-sans text-[12px] text-[#554433]/70">
                No cards on this board yet.
              </p>
            ) : (
              <div className="flex flex-col gap-[6px]">
                {cardList.map((c) => (
                  <CardTile key={c.id} card={c} disabled={disabled} />
                ))}
              </div>
            )
          ) : artifactList.length === 0 ? (
            <p className="py-[16px] text-center font-sans text-[12px] text-[#554433]/70">
              No artifacts in this board's pool yet.
            </p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {artifactList.map((a) => (
                <ArtifactTile key={a.id} artifact={a} disabled={disabled} />
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-[#ebebe6] px-[20px] py-[8px] font-sans text-[10px] text-[#554433]/55">
          Card → Cards Grid filtered · Artifact → Artifact Pool
        </footer>
      </aside>
    </>
  );
}

export const BoardCanvasPalette = memo(BoardCanvasPaletteImpl);
export default BoardCanvasPalette;
