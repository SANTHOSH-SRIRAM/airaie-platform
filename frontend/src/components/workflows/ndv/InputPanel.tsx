import { useMemo } from 'react';
import { ArrowDownToLine } from 'lucide-react';
import { useWorkflowStore } from '@store/workflowStore';
import { useExecutionStore } from '@store/executionStore';
import { useNodeInspectorStore } from '@store/nodeInspectorStore';
import DataTable from './DataTable';

interface InputPanelProps {
  nodeId: string;
}

export default function InputPanel({ nodeId }: InputPanelProps) {
  const edges = useWorkflowStore((s) => s.edges);
  const nodes = useWorkflowStore((s) => s.nodes);
  const nodeStates = useExecutionStore((s) => s.nodeStates);
  const inputPanel = useNodeInspectorStore((s) => s.inputPanel);
  const setInputParentNode = useNodeInspectorStore((s) => s.setInputParentNode);

  // Find parent nodes (nodes that connect INTO this node)
  const parentNodes = useMemo(() => {
    const parentIds = edges
      .filter((e) => e.target === nodeId)
      .map((e) => e.source);
    return nodes.filter((n) => parentIds.includes(n.id));
  }, [edges, nodes, nodeId]);

  // Selected parent
  const selectedParentId = inputPanel.parentNodeId ?? parentNodes[0]?.id ?? null;
  const parentOutputData = selectedParentId
    ? nodeStates.get(selectedParentId)?.outputs
    : undefined;

  // No connections
  if (parentNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
        <ArrowDownToLine size={24} className="text-[#d4d4d4]" />
        <p className="text-sm font-medium text-[#949494]">No input connections</p>
        <p className="text-xs text-[#b4b4b4]">
          Connect a node's output to this node to see input data here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Parent selector */}
      {parentNodes.length > 1 && (
        <div className="mb-3">
          <label className="mb-1 block text-[11px] font-medium text-[#949494]">
            Input from
          </label>
          <select
            value={selectedParentId ?? ''}
            onChange={(e) => setInputParentNode(e.target.value || null)}
            className="w-full rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          >
            {parentNodes.map((pn) => (
              <option key={pn.id} value={pn.id}>
                {pn.data.label} ({pn.data.nodeType})
              </option>
            ))}
          </select>
        </div>
      )}

      {parentNodes.length === 1 && (
        <div className="mb-3">
          <span className="text-[11px] text-[#949494]">
            Input from{' '}
            <span className="font-medium text-[#1a1a1a]">{parentNodes[0].data.label}</span>
          </span>
        </div>
      )}

      {/* Data display */}
      {!parentOutputData ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <p className="text-xs text-[#949494]">Run the workflow to see input data</p>
          <p className="text-[10px] text-[#b4b4b4]">
            Input data will appear here after the parent node produces output.
          </p>
        </div>
      ) : (
        <DataTable data={parentOutputData} />
      )}
    </div>
  );
}
