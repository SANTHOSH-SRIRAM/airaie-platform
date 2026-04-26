import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

// ---------------------------------------------------------------------------
// TypedBlockPlaceholder — temporary NodeView for the 11 typed governance
// blocks until their real components land in subsequent waves (10-02 onward).
//
// Each typed block (intentBlock, inputBlock, kpiBlock, methodBlock, runBlock,
// resultBlock, evidenceBlock, gateBlock, embedCardBlock, embedRecordBlock,
// aiAssistBlock) registers this same component as its NodeView in
// `extensions/typedBlockNodes.ts`. The label + emoji come from KIND_LABELS.
//
// Visual: a dashed-border card with a mono-font label line and a small
// "Real component lands in Wave 2 (Phase 10-02)" caption. Renders the raw
// `attrs` JSON so a developer eyeballing a Card can verify the persistence
// loop is wired correctly.
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<string, string> = {
  intentBlock: '🎯 Intent',
  inputBlock: '📌 Input',
  kpiBlock: '📊 KPI',
  methodBlock: '⚙ Method',
  runBlock: '▶ Run',
  resultBlock: '📈 Result',
  evidenceBlock: '✓ Evidence',
  gateBlock: '🛡 Gate',
  embedCardBlock: '🔗 Card',
  embedRecordBlock: '📄 Record',
  aiAssistBlock: '✨ AI Assist',
};

export function TypedBlockPlaceholder({ node }: NodeViewProps) {
  const kind = node.type.name;
  const label = KIND_LABELS[kind] ?? kind;
  const attrsJson = JSON.stringify(node.attrs ?? {});

  return (
    <NodeViewWrapper
      data-block-type={kind}
      className="my-[8px] rounded-[10px] border border-dashed border-[#e8e8e8] bg-[#fafafa] p-[12px]"
      contentEditable={false}
    >
      <div className="text-[11px] font-mono text-[#9b978f] flex items-center gap-[8px]">
        <span aria-hidden="true">{label.slice(0, 2)}</span>
        <span className="font-semibold">{label.slice(3) || label}</span>
        <span className="ml-auto text-[10px] text-[#acacac] truncate max-w-[400px]">{attrsJson}</span>
      </div>
      <div className="text-[10px] text-[#acacac] mt-[4px]">
        Real component lands in Wave 2 (Phase 10-02).
      </div>
    </NodeViewWrapper>
  );
}
