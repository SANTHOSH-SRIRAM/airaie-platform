import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRunStore } from '@store/runStore';
import { useExecutionOverlay } from '@hooks/useExecutionOverlay';
import TriggerNode from '../nodes/TriggerNode';
import ToolNode from '../nodes/ToolNode';
import AgentNode from '../nodes/AgentNode';
import LogicNode from '../nodes/LogicNode';
import type { WorkflowEditorNode, WorkflowEditorEdge, WorkflowNodeData } from '@/types/workflow';
import type { RunDetail, RunNodeStatus } from '@/types/run';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  tool: ToolNode,
  agent: AgentNode,
  logic: LogicNode,
  governance: ToolNode,
  data: ToolNode,
};

function mapNodeStatus(runStatus: RunNodeStatus): WorkflowNodeData['status'] {
  switch (runStatus) {
    case 'completed':
      return 'completed';
    case 'running':
      return 'running';
    case 'failed':
      return 'failed';
    case 'pending':
    case 'skipped':
    default:
      return 'idle';
  }
}

interface RunDAGViewerProps {
  runDetail: RunDetail | undefined;
  workflowNodes: WorkflowEditorNode[];
  workflowEdges: WorkflowEditorEdge[];
}

export default function RunDAGViewer({ runDetail, workflowNodes, workflowEdges }: RunDAGViewerProps) {
  const selectedRunNodeId = useRunStore((s) => s.selectedRunNodeId);
  const selectRunNode = useRunStore((s) => s.selectRunNode);
  const executionOverlay = useExecutionOverlay();

  const nodes = useMemo(() => {
    if (!runDetail && executionOverlay.size === 0) return workflowNodes;

    // Build status map from runDetail (polling) as base, overlay SSE state on top
    const statusMap = new Map(
      runDetail?.nodes.map((node) => [node.nodeId, node.status]) ?? []
    );

    return workflowNodes.map((node) => {
      const overlay = executionOverlay.get(node.id);
      const runStatus = statusMap.get(node.id);

      // SSE overlay takes priority over polled runDetail
      let status: WorkflowNodeData['status'] = node.data.status;
      let className = '';

      if (overlay) {
        // Map overlay status to WorkflowNodeData status
        const overlayMap: Record<string, WorkflowNodeData['status']> = {
          running: 'running',
          succeeded: 'completed',
          failed: 'failed',
          queued: 'idle',
          skipped: 'idle',
        };
        status = overlayMap[overlay.status] ?? 'idle';
        className = overlay.className;
      } else if (runStatus) {
        status = mapNodeStatus(runStatus);
      }

      return {
        ...node,
        selected: node.id === selectedRunNodeId,
        className,
        data: {
          ...node.data,
          status,
        },
      };
    });
  }, [workflowNodes, runDetail, selectedRunNodeId, executionOverlay]);

  const edges = useMemo(() => {
    if (!runDetail && executionOverlay.size === 0) return workflowEdges;

    // Build status map from runDetail, overlay SSE state
    const statusMap = new Map<string, RunNodeStatus | string>(
      runDetail?.nodes.map((node) => [node.nodeId, node.status]) ?? []
    );

    // Overlay SSE statuses (mapped to RunNodeStatus-like values)
    for (const [nodeId, overlay] of executionOverlay) {
      const sseToRunMap: Record<string, string> = {
        running: 'running',
        succeeded: 'completed',
        failed: 'failed',
        queued: 'pending',
        skipped: 'skipped',
      };
      statusMap.set(nodeId, sseToRunMap[overlay.status] ?? 'pending');
    }

    return workflowEdges.map((edge) => {
      const sourceStatus = statusMap.get(edge.source);
      const targetStatus = statusMap.get(edge.target);

      if (sourceStatus === 'completed' && targetStatus === 'completed') {
        return { ...edge, style: { stroke: '#33b44a', strokeWidth: 2 } };
      }

      if (sourceStatus === 'completed' && targetStatus === 'running') {
        return { ...edge, animated: true, style: { stroke: '#c5c1bb', strokeWidth: 2 } };
      }

      // Animate edge when source node is running (data flowing)
      if (sourceStatus === 'running') {
        return { ...edge, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } };
      }

      if (targetStatus === 'failed') {
        return { ...edge, style: { stroke: '#f05a4a', strokeWidth: 2 } };
      }

      return {
        ...edge,
        style: {
          stroke: '#cfcac3',
          strokeWidth: 2,
          strokeDasharray: targetStatus === 'pending' ? '6 6' : undefined,
        },
      };
    });
  }, [workflowEdges, runDetail, executionOverlay]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: WorkflowEditorNode) => {
    selectRunNode(node.id);
  }, [selectRunNode]);

  return (
    <div className="h-full flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        onPaneClick={() => selectRunNode(null)}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} size={1} color="#f0ede8" />
      </ReactFlow>
    </div>
  );
}
