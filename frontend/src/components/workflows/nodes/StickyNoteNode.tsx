import { memo, useCallback } from 'react';
import { type NodeProps, NodeResizeControl } from '@xyflow/react';
import { StickyNote } from 'lucide-react';
import { useWorkflowStore } from '@store/workflowStore';
import { cn } from '@utils/cn';

function StickyNoteNode({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const text = (nodeData.text as string) ?? '';
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { text: e.target.value } as never);
    },
    [id, updateNodeData]
  );

  return (
    <div
      className={cn(
        'relative min-h-[100px] min-w-[160px] rounded-lg bg-amber-100 p-3 shadow-md',
        selected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      <NodeResizeControl
        minWidth={160}
        minHeight={100}
        className="!absolute !bottom-0 !right-0 !h-4 !w-4 !cursor-se-resize !rounded-none !border-none !bg-transparent"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="absolute bottom-1 right-1 text-amber-400"
        >
          <path
            d="M11 1v10H1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </NodeResizeControl>

      {/* Header */}
      <div className="mb-2 flex items-center gap-1.5">
        <StickyNote size={12} className="text-amber-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">
          Note
        </span>
      </div>

      {/* Editable text */}
      <textarea
        value={text}
        onChange={handleTextChange}
        placeholder="Type a note..."
        className="h-full min-h-[60px] w-full resize-none bg-transparent text-[12px] leading-relaxed text-amber-900 placeholder:text-amber-300 focus:outline-none"
        spellCheck={false}
      />
    </div>
  );
}

export default memo(StickyNoteNode);
