import { memo, useMemo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Brain, Lightbulb } from 'lucide-react';
import type { WorkflowNodeData } from '@/types/workflow';
import { encodeHandle } from '@utils/handleFormat';
import BaseNode, { type HandleConfig } from './BaseNode';

const AGENT_ICONS: Record<string, typeof Brain> = {
  'ai-optimizer': Brain,
  'design-advisor': Lightbulb,
};

/** Labels for the sub-port handles rendered below the node body */
const SUB_PORT_LABELS: { key: string; label: string; short: string; handleType: 'ai_model' | 'ai_tool' | 'ai_policy' | 'ai_memory' }[] = [
  { key: 'model', label: 'Model', short: 'M', handleType: 'ai_model' },
  { key: 'tools', label: 'Tools', short: 'T', handleType: 'ai_tool' },
  { key: 'policy', label: 'Policy', short: 'P', handleType: 'ai_policy' },
  { key: 'memory', label: 'Memory', short: 'Mem', handleType: 'ai_memory' },
];

function AgentNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const Icon = AGENT_ICONS[nodeData.subtype] ?? Brain;

  const handles: HandleConfig[] = useMemo(() => {
    const h: HandleConfig[] = [
      // Main I/O
      {
        id: encodeHandle('inputs', 'main', 0),
        type: 'target' as const,
        position: Position.Left,
        offset: 30,
      },
      {
        id: encodeHandle('outputs', 'main', 0),
        type: 'source' as const,
        position: Position.Right,
        offset: 30,
      },
    ];

    // Sub-port target handles (left side, below main)
    SUB_PORT_LABELS.forEach((port, i) => {
      h.push({
        id: encodeHandle('inputs', port.handleType, 0),
        type: 'target' as const,
        position: Position.Left,
        offset: 55 + i * 12,
        className: '!h-[8px] !w-[8px] !border-[1.5px] !border-white !bg-[#a855f7]',
      });
    });

    return h;
  }, []);

  const subtitle = useMemo(() => {
    if (nodeData.inputs?.goal) return `Goal: ${String(nodeData.inputs.goal)}`;
    return undefined;
  }, [nodeData.inputs]);

  return (
    <BaseNode
      icon={Icon}
      label={nodeData.label}
      borderColor="#a855f7"
      iconBgColor="bg-purple-50"
      iconTextColor="text-[#a855f7]"
      selected={selected}
      version={nodeData.version}
      status={nodeData.status}
      subtitle={subtitle}
      handles={handles}
    >
      {/* Sub-port indicators */}
      <div className="mt-1 flex flex-wrap gap-1">
        {SUB_PORT_LABELS.map((port) => (
          <span
            key={port.key}
            className="inline-flex items-center rounded bg-purple-50 px-1.5 py-0.5 text-[9px] font-medium text-purple-600"
          >
            [{port.short}] {port.label}
          </span>
        ))}
      </div>
    </BaseNode>
  );
}

export default memo(AgentNode);
