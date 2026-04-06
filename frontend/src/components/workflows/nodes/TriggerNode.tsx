import { memo, useMemo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Zap, Webhook, Clock, Radio, Play } from 'lucide-react';
import type { WorkflowNodeData } from '@/types/workflow';
import { encodeHandle } from '@utils/handleFormat';
import BaseNode, { type HandleConfig } from './BaseNode';

const TRIGGER_ICONS: Record<string, typeof Zap> = {
  webhook: Webhook,
  schedule: Clock,
  'event-listener': Radio,
  manual: Play,
};

const TRIGGER_LABELS: Record<string, string> = {
  webhook: 'Webhook',
  schedule: 'Schedule',
  'event-listener': 'Event',
  manual: 'Manual',
};

function TriggerNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const Icon = TRIGGER_ICONS[nodeData.subtype] ?? Zap;

  const subtitle = useMemo(() => {
    const typeLabel = TRIGGER_LABELS[nodeData.subtype] ?? nodeData.subtype;
    if (nodeData.inputs?.endpoint) {
      return `${typeLabel} - POST ${String(nodeData.inputs.endpoint)}`;
    }
    if (nodeData.inputs?.cron) {
      return `${typeLabel} - ${String(nodeData.inputs.cron)}`;
    }
    return typeLabel;
  }, [nodeData.subtype, nodeData.inputs]);

  const handles: HandleConfig[] = useMemo(
    () => [
      {
        id: encodeHandle('outputs', 'main', 0),
        type: 'source' as const,
        position: Position.Right,
      },
    ],
    []
  );

  return (
    <BaseNode
      icon={Icon}
      label={nodeData.label}
      borderColor="#22c55e"
      iconBgColor="bg-[#e8f5e9]"
      iconTextColor="text-[#22c55e]"
      selected={selected}
      version={nodeData.version}
      status={nodeData.status}
      subtitle={subtitle}
      handles={handles}
    />
  );
}

export default memo(TriggerNode);
