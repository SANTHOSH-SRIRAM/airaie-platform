import type { ReactNode } from 'react';
import { MoreHorizontal, Pencil, ChevronDown, Link2 } from 'lucide-react';
import { useWorkflowStore } from '@store/workflowStore';
import { findNodeDefinition } from '@constants/nodeCategories';
import type { WorkflowEditorNode } from '@/types/workflow';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">{title}</h3>
      {children}
    </div>
  );
}

function ParamRow({
  label,
  value,
  tone = 'default',
  icon,
  dropdown = false,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'muted';
  icon?: ReactNode;
  dropdown?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[12px] text-[#949494]">{label}</span>
      <span className="flex items-center gap-1.5 text-right text-[13px] font-mono text-[#1a1a1a]">
        <span className={tone === 'muted' ? 'text-[#6b6b6b]' : ''}>{value}</span>
        {icon}
        {dropdown ? <ChevronDown size={12} className="text-[#a8a8a8]" /> : null}
      </span>
    </div>
  );
}

function ResourceCard({ label, value }: { label: string; value: string }) {
  const isDark = label === 'CPU';
  return (
    <div className="bg-[#f8f8f7] rounded-[8px] p-3 flex flex-col items-center gap-1.5">
      <span className="text-[11px] text-[#949494]">{label}</span>
      <span
        className={
          isDark
            ? 'bg-[#242424] text-white text-[12px] font-mono rounded-full px-3 py-0.5'
            : 'bg-[#d3d3d3] text-[#1a1a1a] text-[12px] font-mono rounded-full px-3 py-0.5'
        }
      >
        {value}
      </span>
    </div>
  );
}

export default function NodePropertiesPanel() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const nodes = useWorkflowStore((s) => s.nodes);

  const node: WorkflowEditorNode | undefined = nodes.find((n) => n.id === selectedNodeId);
  if (!node) {
    return (
      <div className="p-[20px] text-[13px] text-[#949494]">Select a node to view properties</div>
    );
  }

  const def = findNodeDefinition(node.data.subtype);
  const capitalizedType = def?.type
    ? def.type.charAt(0).toUpperCase() + def.type.slice(1)
    : node.data.nodeType.charAt(0).toUpperCase() + node.data.nodeType.slice(1);

  return (
    <div className="p-[20px]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Properties</h2>
        <button className="text-[#949494] hover:text-[#1a1a1a] transition-colors" aria-label="More options">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <Section title="Selection">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[16px] font-semibold text-[#1a1a1a]">{node.data.label}</span>
          <button className="text-[#949494] hover:text-[#1a1a1a] transition-colors" aria-label="Edit name">
            <Pencil size={14} />
          </button>
        </div>
        <span className="text-[12px] text-[#949494]">Type: {capitalizedType} Node</span>
      </Section>

      {node.data.version && (
        <Section title="Tool Version">
          <button className="flex h-[36px] w-full items-center justify-between rounded-[8px] bg-[#fbfaf9] px-3 text-[13px] font-mono text-[#1a1a1a] shadow-[inset_0px_0px_0px_1px_#efefeb]">
            <span>{node.data.version}</span>
            <ChevronDown size={14} className="text-[#949494]" />
          </button>
        </Section>
      )}

      <Section title="Input Parameters">
        {Object.entries(node.data.inputs).map(([key, val]) => {
          if (key === 'mesh_file') {
            return (
              <ParamRow
                key={key}
                label={key}
                value={String(val)}
                icon={<Link2 size={12} className="text-[#a8a8a8]" />}
              />
            );
          }

          if (key === 'output_format') {
            return <ParamRow key={key} label={key} value={String(val)} dropdown />;
          }

          return <ParamRow key={key} label={key} value={String(val)} />;
        })}
        {Object.keys(node.data.inputs).length === 0 && (
          <span className="text-[12px] text-[#949494]">No parameters</span>
        )}
      </Section>

      {node.data.resourceLimits && (
        <Section title="Resource Limits">
          <div className="grid grid-cols-3 gap-2">
            <ResourceCard label="CPU" value={String(node.data.resourceLimits.cpu)} />
            <ResourceCard label="Memory" value={`${node.data.resourceLimits.memoryMb} MB`} />
            <ResourceCard label="Timeout" value={`${node.data.resourceLimits.timeoutSeconds}s`} />
          </div>
        </Section>
      )}

      {node.data.retryPolicy && (
        <Section title="Retry Policy">
          <ParamRow label="Max retries" value={String(node.data.retryPolicy.maxRetries)} />
          <ParamRow label="Wait between" value={`${node.data.retryPolicy.waitBetweenSeconds}s`} />
        </Section>
      )}

      {node.data.metadata && (
        <Section title="Metadata">
          {node.data.metadata.createdAt && <ParamRow label="Created" value={node.data.metadata.createdAt} tone="muted" />}
          {node.data.metadata.lastRunAt && <ParamRow label="Last run" value={node.data.metadata.lastRunAt} tone="muted" />}
          {node.data.metadata.avgCostUsd != null && <ParamRow label="Avg cost" value={`$${node.data.metadata.avgCostUsd.toFixed(2)}/run`} tone="muted" />}
        </Section>
      )}
    </div>
  );
}
