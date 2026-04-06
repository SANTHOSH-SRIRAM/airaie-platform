import { memo, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@utils/cn';

export interface PaletteNodeItemProps {
  icon: LucideIcon;
  label: string;
  description: string;
  nodeType: string;
  subtype: string;
  isActive?: boolean;
}

function PaletteNodeItem({
  icon: Icon,
  label,
  description,
  nodeType,
  subtype,
  isActive = false,
}: PaletteNodeItemProps) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      // Set both data formats so both the new canvas and the legacy canvas can read it
      e.dataTransfer.setData(
        'application/airaie-node',
        JSON.stringify({ type: nodeType, subtype, label })
      );
      // Legacy format for backward compat with existing NodePalette consumers
      e.dataTransfer.setData('application/workflow-node-type', subtype);
      e.dataTransfer.effectAllowed = 'move';
    },
    [nodeType, subtype, label]
  );

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      className={cn(
        'flex w-full items-start gap-[10px] rounded-[10px] px-[12px] py-[10px] text-left',
        'cursor-grab transition-all duration-150 active:cursor-grabbing active:scale-[0.98]',
        isActive ? 'bg-[#ececeb]' : 'hover:bg-[#f8f8f7] hover:scale-[1.01]'
      )}
    >
      <span className="mt-[2px] flex h-[22px] w-[22px] shrink-0 items-center justify-center text-[#8b8b8b]">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[#1a1a1a]">{label}</span>
          <span className="rounded-full bg-[#f3f3f1] px-2 py-[2px] text-[10px] font-medium uppercase tracking-[0.08em] text-[#9b9b9b]">
            {nodeType}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-[1.45] text-[#949494]">{description}</p>
      </div>
    </button>
  );
}

export default memo(PaletteNodeItem);
