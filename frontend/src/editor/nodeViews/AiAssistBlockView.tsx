import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Sparkles } from 'lucide-react';

// ---------------------------------------------------------------------------
// AiAssistBlockView — Wave 10-04 STUB NodeView for the `aiAssistBlock` Tiptap
// node. Renders a recognizable card showing the bound conversationId, but
// makes NO API call: the kernel does not yet expose a `/v0/conversations`
// (or equivalent) route, so a real fetch would 404 every render. The block
// kind, attrs, and slash-menu item all stay so users can drop the block in
// and have its conversationId persist; the runtime wiring lights up when the
// backend ships.
// ---------------------------------------------------------------------------

function AiAssistBlockViewImpl({ node }: NodeViewProps) {
  const conversationId =
    (node.attrs as { conversationId: string | null }).conversationId ?? '';

  return (
    <NodeViewWrapper
      data-block-type="aiAssistBlock"
      className="my-[8px] rounded-[10px] border border-dashed border-[#d6d2c2] bg-[#fffdf6] p-[12px]"
      contentEditable={false}
    >
      <div className="flex items-center gap-[8px]">
        <Sparkles size={14} className="text-[#7b1fa2] shrink-0" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[#1a1a1a]">AI Assist</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-[#6b6b6b]">
          coming soon
        </span>
      </div>
      <div className="text-[11px] text-[#6b6b6b] mt-[4px]">
        Conversational AI for this card. Wiring lights up when the backend ships.
      </div>
      {conversationId ? (
        <div className="text-[10px] font-mono text-[#acacac] mt-[4px]">
          conversationId: {conversationId}
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

export const AiAssistBlockView = memo(AiAssistBlockViewImpl);
export default AiAssistBlockView;
