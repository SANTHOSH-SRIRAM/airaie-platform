import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2, AlertCircle, Link2, ExternalLink } from 'lucide-react';
import { useCard } from '@hooks/useCards';

// ---------------------------------------------------------------------------
// EmbedCardBlockView — Wave 10-04 NodeView for the `embedCardBlock` Tiptap
// node. Renders a mini-card preview (title + intent_type + status) with a
// click-through link to /cards/:cardId.
// ---------------------------------------------------------------------------

function EmbedCardBlockViewImpl({ node }: NodeViewProps) {
  const cardId = (node.attrs as { cardId: string | null }).cardId;
  const { data: card, isLoading, error } = useCard(cardId ?? undefined);

  if (!cardId) {
    return (
      <NodeViewWrapper
        data-block-type="embedCardBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <Link2 size={14} className="text-[#acacac]" aria-hidden="true" />
          <span className="font-semibold">Card link</span>
          <span className="text-[#acacac]">— not set</span>
        </div>
      </NodeViewWrapper>
    );
  }

  if (isLoading) {
    return (
      <NodeViewWrapper
        data-block-type="embedCardBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="status">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          Loading card…
        </div>
      </NodeViewWrapper>
    );
  }

  if (error || !card) {
    return (
      <NodeViewWrapper
        data-block-type="embedCardBlock"
        className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span>
            Could not load card <code className="font-mono">{cardId}</code>.
          </span>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      data-block-type="embedCardBlock"
      className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
      contentEditable={false}
    >
      <a
        href={`/cards/${card.id}`}
        className="flex items-center gap-[8px] text-[12px] text-[#1a1a1a] no-underline hover:bg-[#fafaf7] -m-[4px] p-[4px] rounded-[6px]"
      >
        <Link2 size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
        <span className="font-semibold">{card.title || 'Untitled card'}</span>
        {card.intent_type ? (
          <span className="text-[10px] uppercase tracking-wide text-[#6b6b6b] bg-[#f0f0ec] px-[6px] py-[1px] rounded-[4px]">
            {card.intent_type}
          </span>
        ) : null}
        <span className="ml-auto text-[10px] uppercase tracking-wide text-[#6b6b6b]">
          {card.status ?? 'draft'}
        </span>
        <ExternalLink size={12} className="text-[#acacac]" aria-hidden="true" />
      </a>
    </NodeViewWrapper>
  );
}

export const EmbedCardBlockView = memo(EmbedCardBlockViewImpl);
export default EmbedCardBlockView;
