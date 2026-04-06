import { useCallback, useMemo } from 'react';
import { Settings2, ArrowDownToLine, BoxSelect } from 'lucide-react';
import { cn } from '@utils/cn';
import { useNodeInspectorStore, type InspectorTab } from '@store/nodeInspectorStore';
import { useWorkflowStore } from '@store/workflowStore';
import { useToolTypesStore } from '@store/toolTypesStore';
import { useUiStore } from '@store/uiStore';
import InspectorHeader from './InspectorHeader';
import ParameterForm from './ParameterForm';
import InputPanel from './InputPanel';
import OutputPanel from './OutputPanel';
import type { WorkflowNodeType } from '@constants/nodeCategories';

const TABS: { key: InspectorTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'parameters', label: 'Parameters', icon: Settings2 },
  { key: 'input', label: 'Input', icon: ArrowDownToLine },
  { key: 'output', label: 'Output', icon: BoxSelect },
];

export default function NodeInspector() {
  const activeNodeId = useNodeInspectorStore((s) => s.activeNodeId);
  const activeTab = useNodeInspectorStore((s) => s.activeTab);
  const setActiveTab = useNodeInspectorStore((s) => s.setActiveTab);
  const close = useNodeInspectorStore((s) => s.close);
  const closeRightPanel = useUiStore((s) => s.closeRightPanel);

  const nodes = useWorkflowStore((s) => s.nodes);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const getToolType = useToolTypesStore((s) => s.getToolType);

  // Find the active node
  const node = useMemo(
    () => nodes.find((n) => n.id === activeNodeId) ?? null,
    [nodes, activeNodeId]
  );

  // Get tool contract if available
  const toolType = useMemo(() => {
    if (!node?.data?.subtype) return undefined;
    // Try toolRef first, then subtype
    const ref = (node.data as Record<string, unknown>).toolRef as string | undefined;
    if (ref) {
      const found = getToolType(ref);
      if (found) return found;
    }
    return getToolType(node.data.subtype);
  }, [node, getToolType]);

  const contract = toolType?.contract ?? null;

  // Handlers
  const handleClose = useCallback(() => {
    close();
    closeRightPanel();
  }, [close, closeRightPanel]);

  const handleLabelChange = useCallback(
    (label: string) => {
      if (!activeNodeId) return;
      updateNodeData(activeNodeId, { label });
    },
    [activeNodeId, updateNodeData]
  );

  const handleParameterChange = useCallback(
    (key: string, value: unknown) => {
      if (!activeNodeId) return;
      updateNodeData(activeNodeId, {
        inputs: { ...(node?.data.inputs ?? {}), [key]: value },
      });
    },
    [activeNodeId, node, updateNodeData]
  );

  const handleResourceLimitsChange = useCallback(
    (limits: { cpu: number; memoryMb: number; timeoutSeconds: number }) => {
      if (!activeNodeId) return;
      updateNodeData(activeNodeId, { resourceLimits: limits });
    },
    [activeNodeId, updateNodeData]
  );

  const handleRetryPolicyChange = useCallback(
    (policy: { maxRetries: number; delaySeconds: number }) => {
      if (!activeNodeId) return;
      updateNodeData(activeNodeId, {
        retryPolicy: { ...policy, waitBetweenSeconds: policy.delaySeconds },
      });
    },
    [activeNodeId, updateNodeData]
  );

  // No node selected
  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center">
        <p className="text-sm text-[#949494]">Select a node to inspect</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <InspectorHeader
        nodeId={node.id}
        label={node.data.label}
        nodeType={node.data.nodeType as WorkflowNodeType}
        subtype={node.data.subtype}
        version={node.data.version}
        onLabelChange={handleLabelChange}
        onClose={handleClose}
      />

      {/* Tab bar */}
      <div className="flex border-b border-[#eceae4]">
        {TABS.map(({ key, label, icon: TabIcon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              activeTab === key
                ? 'border-b-2 border-[#1a1a1a] text-[#1a1a1a]'
                : 'text-[#949494] hover:text-[#1a1a1a]'
            )}
          >
            <TabIcon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'parameters' && (
          <ParameterForm
            contract={contract}
            values={node.data.inputs as Record<string, unknown>}
            onChange={handleParameterChange}
            resourceLimits={node.data.resourceLimits}
            onResourceLimitsChange={handleResourceLimitsChange}
            retryPolicy={
              node.data.retryPolicy
                ? {
                    maxRetries: node.data.retryPolicy.maxRetries,
                    delaySeconds: node.data.retryPolicy.waitBetweenSeconds,
                  }
                : undefined
            }
            onRetryPolicyChange={handleRetryPolicyChange}
          />
        )}
        {activeTab === 'input' && <InputPanel nodeId={node.id} />}
        {activeTab === 'output' && <OutputPanel nodeId={node.id} />}
      </div>
    </div>
  );
}
