import { memo, useMemo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Shield, ShieldCheck, FileCheck } from 'lucide-react';
import type { WorkflowNodeData } from '@/types/workflow';
import { encodeHandle } from '@utils/handleFormat';
import BaseNode, { type HandleConfig } from './BaseNode';

const GATE_ICONS: Record<string, typeof Shield> = {
  'approval-gate': ShieldCheck,
  'evidence-gate': FileCheck,
};

type GateStatus = 'pending' | 'passed' | 'failed' | 'waived';

const GATE_STATUS_STYLES: Record<GateStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Pending' },
  passed: { bg: 'bg-green-50', text: 'text-green-600', label: 'Passed' },
  failed: { bg: 'bg-red-50', text: 'text-red-600', label: 'Failed' },
  waived: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Waived' },
};

function getGateStatus(nodeData: WorkflowNodeData): GateStatus {
  // Derive gate status from execution status or config
  if (nodeData.status === 'completed') return 'passed';
  if (nodeData.status === 'failed') return 'failed';
  if (nodeData.inputs?.waived === true) return 'waived';
  return 'pending';
}

function GateNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const Icon = GATE_ICONS[nodeData.subtype] ?? Shield;
  const gateStatus = getGateStatus(nodeData);
  const statusStyle = GATE_STATUS_STYLES[gateStatus];

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
    const parts: string[] = [];
    if (nodeData.inputs?.approvers) {
      parts.push(`Approvers: ${String(nodeData.inputs.approvers)}`);
    }
    if (nodeData.inputs?.criteria) {
      parts.push(`Criteria: ${String(nodeData.inputs.criteria)}`);
    }
    return parts.length > 0 ? parts.join(' | ') : undefined;
  }, [nodeData.inputs]);

  const requirementCount = useMemo(() => {
    if (nodeData.inputs?.requirements && Array.isArray(nodeData.inputs.requirements)) {
      return (nodeData.inputs.requirements as unknown[]).length;
    }
    return undefined;
  }, [nodeData.inputs]);

  return (
    <BaseNode
      icon={Icon}
      label={nodeData.label}
      borderColor="#14b8a6"
      iconBgColor="bg-teal-50"
      iconTextColor="text-[#14b8a6]"
      selected={selected}
      version={nodeData.version}
      status={nodeData.status}
      subtitle={subtitle}
      handles={handles}
    >
      <div className="mt-1.5 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
        >
          {statusStyle.label}
        </span>
        {requirementCount !== undefined && (
          <span className="text-[10px] text-[#949494]">
            {requirementCount} requirement{requirementCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(GateNode);
