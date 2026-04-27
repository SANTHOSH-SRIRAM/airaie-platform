import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2, AlertCircle, Pin } from 'lucide-react';
import { useArtifact } from '@hooks/useArtifacts';
import { formatArtifactSummary } from './InputBlockView.helpers';

// ---------------------------------------------------------------------------
// InputBlockView — Wave 10-02 NodeView for the `inputBlock` Tiptap node.
//
// Reads `attrs.artifactId` (and optional `attrs.portName`), fetches the
// artifact via `useArtifact`, renders a single-line summary (name · type ·
// size). The drag-drop picker that fills `artifactId` from the right-side
// palette ships in 10-04; this wave only renders the bound state.
// ---------------------------------------------------------------------------

function InputBlockViewImpl({ node }: NodeViewProps) {
  const attrs = node.attrs as { artifactId: string | null; portName?: string | null };
  const { data: artifact, isLoading, error } = useArtifact(attrs.artifactId ?? undefined);

  // Empty — artifact not yet pinned.
  if (!attrs.artifactId) {
    return (
      <NodeViewWrapper
        data-block-type="inputBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <Pin size={14} className="text-[#1976d2]" aria-hidden="true" />
          <span className="font-semibold">
            Input{attrs.portName ? ` · ${attrs.portName}` : ''}
          </span>
          <span className="text-[#acacac]">— not yet pinned</span>
        </div>
        <div className="text-[11px] text-[#acacac] mt-[4px]">
          Drag an artifact from the palette in a later wave (10-04). For now, set inputs via the structured page.
        </div>
      </NodeViewWrapper>
    );
  }

  // Loading.
  if (isLoading) {
    return (
      <NodeViewWrapper
        data-block-type="inputBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="status">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          Loading input artifact…
        </div>
      </NodeViewWrapper>
    );
  }

  // Error.
  if (error || !artifact) {
    return (
      <NodeViewWrapper
        data-block-type="inputBlock"
        className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span>
            Could not load artifact <code className="font-mono">{attrs.artifactId}</code>.
          </span>
        </div>
      </NodeViewWrapper>
    );
  }

  // Loaded.
  return (
    <NodeViewWrapper
      data-block-type="inputBlock"
      className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
      contentEditable={false}
    >
      <div className="flex items-center gap-[8px]">
        <Pin size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[#1a1a1a]">
          Input{attrs.portName ? ` · ${attrs.portName}` : ''}
        </span>
      </div>
      <div className="text-[12px] text-[#1a1a1a] mt-[6px] leading-[1.5]">
        {formatArtifactSummary(artifact)}
      </div>
      {artifact.content_hash ? (
        <div className="text-[10px] font-mono text-[#acacac] mt-[2px] truncate">
          {artifact.content_hash}
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

export const InputBlockView = memo(InputBlockViewImpl);
export default InputBlockView;
