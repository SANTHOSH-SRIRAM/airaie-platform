import type { NodeTypes } from '@xyflow/react';
import TriggerNode from './TriggerNode';
import ToolNode from './ToolNode';
import AgentNode from './AgentNode';
import LogicNode from './LogicNode';
import GateNode from './GateNode';
import DataNode from './DataNode';
import StickyNoteNode from './StickyNoteNode';

export { default as BaseNode } from './BaseNode';
export { default as TriggerNode } from './TriggerNode';
export { default as ToolNode } from './ToolNode';
export { default as AgentNode } from './AgentNode';
export { default as LogicNode } from './LogicNode';
export { default as GateNode } from './GateNode';
export { default as DataNode } from './DataNode';
export { default as StickyNoteNode } from './StickyNoteNode';

/**
 * nodeTypes registry for ReactFlow.
 * Keys must match the `type` field on WorkflowEditorNode
 * and the return values from canvasMapping.mapNodeType().
 *
 * "governance" is aliased to GateNode so nodes from
 * nodeCategories.ts (which use type: 'governance') render correctly.
 */
export const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  tool: ToolNode,
  agent: AgentNode,
  logic: LogicNode,
  gate: GateNode,
  governance: GateNode,
  data: DataNode,
  stickyNote: StickyNoteNode,
};
