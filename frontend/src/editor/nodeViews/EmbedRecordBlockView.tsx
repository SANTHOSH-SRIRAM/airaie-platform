import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2, AlertCircle, FileText } from 'lucide-react';
import { useRecord } from '@hooks/useBoards';
import { useCardCanvasContext } from '@/editor/cardCanvasContext';

// ---------------------------------------------------------------------------
// EmbedRecordBlockView — Wave 10-04 NodeView for the `embedRecordBlock`
// Tiptap node. Renders a record reference inline (title + body preview).
// Pulls the boardId from cardCanvasContext (the canvas always sits inside
// a board); the record id comes from attrs.
// ---------------------------------------------------------------------------

const PREVIEW_MAX_CHARS = 120;

/**
 * Extract a short text preview from a record's content blob. Records store
 * arbitrary JSON in `content`; canonical convention is `{ text: string }`,
 * but we tolerate other shapes by JSON-stringifying as a fallback.
 */
function formatRecordPreview(
  content: Record<string, unknown> | undefined,
  maxChars = PREVIEW_MAX_CHARS,
): string {
  if (!content) return '';
  const text = (content as { text?: unknown }).text;
  const source =
    typeof text === 'string' && text.trim().length > 0
      ? text
      : JSON.stringify(content);
  if (source.length <= maxChars) return source;
  return source.slice(0, maxChars - 1).trimEnd() + '…';
}

function EmbedRecordBlockViewImpl({ node }: NodeViewProps) {
  const recordId = (node.attrs as { recordId: string | null }).recordId;
  const ctx = useCardCanvasContext();
  const { data: record, isLoading, error } = useRecord(
    ctx.boardId ?? undefined,
    recordId ?? undefined,
  );

  if (!recordId) {
    return (
      <NodeViewWrapper
        data-block-type="embedRecordBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <FileText size={14} className="text-[#acacac]" aria-hidden="true" />
          <span className="font-semibold">Record</span>
          <span className="text-[#acacac]">— not linked</span>
        </div>
      </NodeViewWrapper>
    );
  }

  if (!ctx.boardId) {
    return (
      <NodeViewWrapper
        data-block-type="embedRecordBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <FileText size={14} className="text-[#acacac]" aria-hidden="true" />
          <span className="font-semibold">Record</span>
          <span className="text-[#acacac]">— no board context (mounted outside CardCanvasPage)</span>
        </div>
      </NodeViewWrapper>
    );
  }

  if (isLoading) {
    return (
      <NodeViewWrapper
        data-block-type="embedRecordBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="status">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          Loading record…
        </div>
      </NodeViewWrapper>
    );
  }

  if (error || !record) {
    return (
      <NodeViewWrapper
        data-block-type="embedRecordBlock"
        className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span>
            Could not load record <code className="font-mono">{recordId}</code>.
          </span>
        </div>
      </NodeViewWrapper>
    );
  }

  const preview = formatRecordPreview(record.content);

  return (
    <NodeViewWrapper
      data-block-type="embedRecordBlock"
      className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
      contentEditable={false}
    >
      <div className="flex items-center gap-[8px]">
        <FileText size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[#1a1a1a]">{record.title || 'Untitled record'}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-[#6b6b6b] bg-[#f0f0ec] px-[6px] py-[1px] rounded-[4px]">
          {record.record_type}
        </span>
      </div>
      {preview ? (
        <div className="text-[11px] text-[#6b6b6b] mt-[6px] leading-[1.5] whitespace-pre-wrap">
          {preview}
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

export const EmbedRecordBlockView = memo(EmbedRecordBlockViewImpl);
export default EmbedRecordBlockView;

// Exported for unit tests.
export { formatRecordPreview };
