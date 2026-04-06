import { memo, useMemo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import {
  Wrench,
  Triangle,
  Wind,
  Grid3x3,
  Database,
} from 'lucide-react';
import type { WorkflowNodeData } from '@/types/workflow';
import { encodeHandle } from '@utils/handleFormat';
import BaseNode, { type HandleConfig } from './BaseNode';

const TOOL_ICONS: Record<string, typeof Wrench> = {
  'fea-solver': Triangle,
  'cfd-engine': Wind,
  'mesh-generator': Grid3x3,
  'material-db': Database,
};

function ToolNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const Icon = TOOL_ICONS[nodeData.subtype] ?? Wrench;

  const handles: HandleConfig[] = useMemo(
    () => [
      {
        id: encodeHandle('inputs', 'main', 0),
        type: 'target' as const,
        position: Position.Left,
      },
      {
        id: encodeHandle('outputs', 'main', 0),
        type: 'source' as const,
        position: Position.Right,
      },
    ],
    []
  );

  const subtitle = useMemo(() => {
    if (nodeData.inputs?.tool_ref) return String(nodeData.inputs.tool_ref);
    // Derive a subtitle from subtype
    const subtypeLabels: Record<string, string> = {
      'fea-solver': 'Finite element analysis',
      'cfd-engine': 'Flow simulation',
      'mesh-generator': 'Structured mesh generation',
      'material-db': 'Material property lookup',
    };
    return subtypeLabels[nodeData.subtype];
  }, [nodeData.subtype, nodeData.inputs]);

  return (
    <BaseNode
      icon={Icon}
      label={nodeData.label}
      borderColor="#f97316"
      iconBgColor="bg-orange-50"
      iconTextColor="text-[#f97316]"
      selected={selected}
      version={nodeData.version}
      status={nodeData.status}
      subtitle={subtitle}
      handles={handles}
    />
  );
}

export default memo(ToolNode);
