import { useState, useCallback, useRef, useEffect } from 'react';
import {
  X,
  Webhook,
  Clock,
  Radio,
  Triangle,
  Wind,
  Grid3X3,
  Database,
  Brain,
  Lightbulb,
  GitBranch,
  Repeat,
  ShieldCheck,
  FileCheck,
  HardDrive,
  ArrowRightLeft,
  Box,
} from 'lucide-react';
import { cn } from '@utils/cn';
import type { WorkflowNodeType } from '@constants/nodeCategories';

interface InspectorHeaderProps {
  nodeId: string;
  label: string;
  nodeType: WorkflowNodeType;
  subtype: string;
  version?: string;
  onLabelChange: (label: string) => void;
  onClose: () => void;
}

// Map subtype strings to lucide icon components
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  webhook: Webhook,
  schedule: Clock,
  'event-listener': Radio,
  'fea-solver': Triangle,
  'cfd-engine': Wind,
  'mesh-generator': Grid3X3,
  'material-db': Database,
  'ai-optimizer': Brain,
  'design-advisor': Lightbulb,
  condition: GitBranch,
  loop: Repeat,
  'approval-gate': ShieldCheck,
  'evidence-gate': FileCheck,
  'artifact-store': HardDrive,
  transform: ArrowRightLeft,
};

// Node type to display label and color
const TYPE_CONFIG: Record<WorkflowNodeType, { label: string; color: string; bg: string }> = {
  trigger: { label: 'Trigger', color: 'text-green-700', bg: 'bg-green-100' },
  tool: { label: 'Tool', color: 'text-blue-700', bg: 'bg-blue-100' },
  agent: { label: 'Agent', color: 'text-purple-700', bg: 'bg-purple-100' },
  logic: { label: 'Logic', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  governance: { label: 'Governance', color: 'text-orange-700', bg: 'bg-orange-100' },
  data: { label: 'Data', color: 'text-teal-700', bg: 'bg-teal-100' },
};

export default function InspectorHeader({
  nodeId,
  label,
  nodeType,
  subtype,
  version,
  onLabelChange,
  onClose,
}: InspectorHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  const Icon = ICON_MAP[subtype] ?? Box;
  const typeConfig = TYPE_CONFIG[nodeType] ?? TYPE_CONFIG.tool;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleStartEdit = useCallback(() => {
    setEditValue(label);
    setEditing(true);
  }, [label]);

  const handleConfirm = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      onLabelChange(trimmed);
    }
    setEditing(false);
  }, [editValue, label, onLabelChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleConfirm();
      } else if (e.key === 'Escape') {
        setEditing(false);
      }
    },
    [handleConfirm]
  );

  return (
    <div className="flex items-center gap-3 border-b border-[#eceae4] px-4 py-3">
      {/* Node icon */}
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', typeConfig.bg)}>
        <Icon size={16} className={typeConfig.color} />
      </div>

      {/* Name + badges */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleConfirm}
              onKeyDown={handleKeyDown}
              className="min-w-0 flex-1 rounded border border-blue-400 px-1.5 py-0.5 text-sm font-medium text-[#1a1a1a] outline-none ring-1 ring-blue-400"
            />
          ) : (
            <span
              className="cursor-pointer truncate text-sm font-medium text-[#1a1a1a] hover:underline"
              onClick={handleStartEdit}
              title="Click to rename"
            >
              {label}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              typeConfig.bg,
              typeConfig.color
            )}
          >
            {typeConfig.label}
          </span>
          {version && (
            <span className="rounded-full bg-[#efefef] px-1.5 py-0.5 text-[10px] text-[#949494]">
              v{version}
            </span>
          )}
        </div>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#949494] hover:bg-[#f7f7f5] hover:text-[#1a1a1a]"
        aria-label="Close inspector"
      >
        <X size={16} />
      </button>
    </div>
  );
}
