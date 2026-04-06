import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  ControlButton,
  MiniMap,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Scan, Settings2 } from 'lucide-react';
import { useWorkflowStore } from '@store/workflowStore';
import { useCanvasStore } from '@store/canvasStore';
import { useNodeInspectorStore } from '@store/nodeInspectorStore';
import { useUiStore } from '@store/uiStore';
import { findNodeDefinition } from '@constants/nodeCategories';
import { generateNodeId, snapToGrid } from '@utils/canvasMapping';
import { nodeTypes } from '../nodes';
import type { WorkflowEditorNode } from '@/types/workflow';

export default function WorkflowCanvas() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const addNode = useWorkflowStore((s) => s.addNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);

  const showMiniMap = useCanvasStore((s) => s.showMiniMap);
  const snapEnabled = useCanvasStore((s) => s.snapToGrid);
  const gridSize = useCanvasStore((s) => s.gridSize);

  const setActiveNode = useNodeInspectorStore((s) => s.setActiveNode);
  const openRightPanel = useUiStore((s) => s.openRightPanel);

  const { screenToFlowPosition } = useReactFlow();

  // --- Drop handler: create node from palette drag ---
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Try new data format first, fall back to legacy
      const airaieData = event.dataTransfer.getData('application/airaie-node');
      let nodeType: string | undefined;
      let subtype: string | undefined;
      let label: string | undefined;

      if (airaieData) {
        try {
          const parsed = JSON.parse(airaieData) as {
            type: string;
            subtype: string;
            label: string;
          };
          nodeType = parsed.type;
          subtype = parsed.subtype;
          label = parsed.label;
        } catch {
          // ignore parse error
        }
      }

      // Legacy: the existing NodePalette sets 'application/workflow-node-type'
      if (!subtype) {
        subtype = event.dataTransfer.getData('application/workflow-node-type');
        if (!subtype) return;
        const def = findNodeDefinition(subtype);
        if (!def) return;
        nodeType = def.type;
        label = def.label;
      }

      if (!nodeType || !subtype || !label) return;

      const def = findNodeDefinition(subtype);

      // Convert screen coords to flow coords
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Snap to grid if enabled
      const position = snapEnabled
        ? snapToGrid(flowPosition.x, flowPosition.y, gridSize)
        : { x: flowPosition.x, y: flowPosition.y };

      const newNode: WorkflowEditorNode = {
        id: generateNodeId(),
        type: nodeType,
        position,
        data: {
          label,
          subtype,
          nodeType: nodeType as WorkflowEditorNode['data']['nodeType'],
          inputs: def
            ? Object.fromEntries(
                Object.entries(def.defaultInputs).map(([k, v]) => [k, v.default ?? ''])
              )
            : {},
        },
      };

      addNode(newNode);
    },
    [addNode, screenToFlowPosition, snapEnabled, gridSize]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // --- Node click handler ---
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: WorkflowEditorNode) => {
      selectNode(node.id);
      setActiveNode(node.id);
      openRightPanel('nodeInspector');
    },
    [selectNode, setActiveNode, openRightPanel]
  );

  const handlePaneClick = useCallback(() => {
    selectNode(null);
    setActiveNode(null);
  }, [selectNode, setActiveNode]);

  return (
    <div className="h-full w-full" onDrop={handleDrop} onDragOver={handleDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        deleteKeyCode="Delete"
        minZoom={0.35}
        maxZoom={1.8}
        snapToGrid={snapEnabled}
        snapGrid={[gridSize, gridSize]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          interactionWidth: 24,
        }}
        className="bg-white"
      >
        <Background
          gap={40}
          size={1}
          color="#ece9e3"
          variant={BackgroundVariant.Dots}
        />

        {showMiniMap && (
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            className="!rounded-lg !border !border-[#eceae4] !shadow-md"
          />
        )}

        <Controls
          position="top-right"
          showInteractive={false}
          className="!top-1/2 !right-3 !left-auto !bottom-auto !-translate-y-1/2 !rounded-[14px] !border !border-[#eceae4] !bg-white !shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]"
        >
          <ControlButton aria-label="Fit selected">
            <Scan size={14} />
          </ControlButton>
          <ControlButton aria-label="Workflow settings">
            <Settings2 size={14} />
          </ControlButton>
        </Controls>
      </ReactFlow>
    </div>
  );
}
