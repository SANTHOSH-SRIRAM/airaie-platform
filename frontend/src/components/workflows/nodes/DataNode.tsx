import { memo, useMemo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { FileUp, ArrowRightLeft, HardDrive } from 'lucide-react';
import type { WorkflowNodeData } from '@/types/workflow';
import { encodeHandle } from '@utils/handleFormat';
import BaseNode, { type HandleConfig } from './BaseNode';

const DATA_ICONS: Record<string, typeof FileUp> = {
  'artifact-store': HardDrive,
  transform: ArrowRightLeft,
  upload: FileUp,
};

function DataNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const Icon = DATA_ICONS[nodeData.subtype] ?? FileUp;

  // Upload variant: 0 inputs, 1 output
  // Transform/store variant: 1 input, 1 output
  const isUpload = nodeData.subtype === 'upload';

  const handles: HandleConfig[] = useMemo(() => {
    const h: HandleConfig[] = [];

    if (!isUpload) {
      h.push({
        id: encodeHandle('inputs', 'main', 0),
        type: 'target' as const,
        position: Position.Left,
      });
    }

    h.push({
      id: encodeHandle('outputs', 'main', 0),
      type: 'source' as const,
      position: Position.Right,
    });

    return h;
  }, [isUpload]);

  const subtitle = useMemo(() => {
    if (nodeData.inputs?.operation) return `Operation: ${String(nodeData.inputs.operation)}`;
    if (nodeData.inputs?.script) return 'Custom transform';
    if (isUpload) return 'File upload';
    const labels: Record<string, string> = {
      'artifact-store': 'Store/retrieve artifacts',
      transform: 'Data transformation',
    };
    return labels[nodeData.subtype];
  }, [nodeData.subtype, nodeData.inputs, isUpload]);

  return (
    <BaseNode
      icon={Icon}
      label={nodeData.label}
      borderColor="#6b7280"
      iconBgColor="bg-gray-100"
      iconTextColor="text-[#6b7280]"
      selected={selected}
      version={nodeData.version}
      status={nodeData.status}
      subtitle={subtitle}
      handles={handles}
    >
      {/* Data type indicator */}
      {Boolean(nodeData.inputs?.output_format) && (
        <div className="mt-1">
          <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium uppercase text-gray-500">
            {String(nodeData.inputs.output_format)}
          </span>
        </div>
      )}
    </BaseNode>
  );
}

export default memo(DataNode);
