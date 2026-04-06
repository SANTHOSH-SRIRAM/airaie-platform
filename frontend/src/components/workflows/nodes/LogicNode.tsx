import { memo, useMemo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { GitBranch, Repeat } from 'lucide-react';
import type { WorkflowNodeData } from '@/types/workflow';
import { encodeHandle } from '@utils/handleFormat';
import BaseNode, { type HandleConfig } from './BaseNode';

const LOGIC_ICONS: Record<string, typeof GitBranch> = {
  condition: GitBranch,
  loop: Repeat,
};

function LogicNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const Icon = LOGIC_ICONS[nodeData.subtype] ?? GitBranch;
  const isCondition = nodeData.subtype === 'condition';

  const handles: HandleConfig[] = useMemo(() => {
    const h: HandleConfig[] = [
      {
        id: encodeHandle('inputs', 'main', 0),
        type: 'target' as const,
        position: Position.Left,
      },
      {
        id: encodeHandle('outputs', 'main', 0),
        type: 'source' as const,
        position: Position.Right,
        offset: isCondition ? 35 : undefined,
      },
    ];

    // Condition node gets a second output for the "false" branch
    if (isCondition) {
      h.push({
        id: encodeHandle('outputs', 'main', 1),
        type: 'source' as const,
        position: Position.Right,
        offset: 70,
      });
    }

    return h;
  }, [isCondition]);

  const subtitle = useMemo(() => {
    if (nodeData.inputs?.expression) {
      return String(nodeData.inputs.expression);
    }
    if (nodeData.inputs?.maxIterations) {
      return `Max: ${String(nodeData.inputs.maxIterations)} iterations`;
    }
    return undefined;
  }, [nodeData.inputs]);

  return (
    <div className="relative">
      <BaseNode
        icon={Icon}
        label={nodeData.label}
        borderColor="#3b82f6"
        iconBgColor="bg-blue-50"
        iconTextColor="text-[#3b82f6]"
        selected={selected}
        version={nodeData.version}
        status={nodeData.status}
        subtitle={subtitle}
        handles={handles}
      >
        {/* True/False labels for condition nodes */}
        {isCondition && (
          <div className="mt-1.5 flex items-center gap-2 text-[10px]">
            <span className="rounded bg-green-50 px-1.5 py-0.5 font-medium text-green-600">
              True
            </span>
            <span className="rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-500">
              False
            </span>
          </div>
        )}
      </BaseNode>
      {/* Diamond indicator for logic nodes */}
      <div className="absolute -top-1 -right-1 h-3 w-3 rotate-45 rounded-[2px] border border-[#3b82f6] bg-blue-100" />
    </div>
  );
}

export default memo(LogicNode);
