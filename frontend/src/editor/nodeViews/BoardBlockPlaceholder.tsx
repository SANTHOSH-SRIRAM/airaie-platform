import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

// ---------------------------------------------------------------------------
// BoardBlockPlaceholder — temporary NodeView for the 4 Board-specific
// typed-governance kinds whose real components ship in Wave 10-05c.
// CardsGridBlock has its own real NodeView from 10-05b onwards.
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<string, string> = {
  cardsGridBlock: '🗂️ Cards Grid',
  cardsGraphBlock: '🕸️ Cards Graph',
  gatesRollupBlock: '🛡 Gates Rollup',
  evidenceRollupBlock: '✓ Evidence Rollup',
  artifactPoolBlock: '📦 Artifact Pool',
};

export function BoardBlockPlaceholder({ node }: NodeViewProps) {
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
        <span aria-hidden="true">{label.split(' ')[0]}</span>
        <span className="font-semibold">{label.split(' ').slice(1).join(' ')}</span>
        <span className="ml-auto text-[10px] text-[#acacac] truncate max-w-[400px]">{attrsJson}</span>
      </div>
      <div className="text-[10px] text-[#acacac] mt-[4px]">
        Real component lands in Wave 10-05c.
      </div>
    </NodeViewWrapper>
  );
}
