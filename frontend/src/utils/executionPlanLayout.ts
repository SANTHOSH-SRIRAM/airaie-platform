/**
 * ExecutionPlan -> ReactFlow graph converter.
 *
 * Plans come from the kernel's plan_compiler/plan_generator services as a
 * shape distinct from the workflow DSL: nodes carry `node_id`, `tool_id`,
 * `tool_version`, `role`, and `parameters`; edges are `{from_node_id,
 * to_node_id}` pairs. Some legacy plans omit `edges` entirely and rely on
 * a `depends_on[]` field on the node — we tolerate both.
 *
 * The output uses the custom `planNode` type (registered by `PlanDagView`)
 * rather than the workflow editor's `tool/agent/...` registry, because
 * plan nodes are role-coloured and read-only; reusing the editor's nodes
 * would force the plan into a shape it does not have.
 */

import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from '@xyflow/react';
import type { ExecutionPlan, PlanNode, PlanNodeRole } from '@/types/plan';
import { autoLayoutByDepth } from './dagLayout';

export interface PlanFlowNodeData extends Record<string, unknown> {
  /** Display label — falls back to humanised node_id. */
  label: string;
  /** Role classification (validate_input | preprocess | solve | ...). */
  role: PlanNodeRole;
  /** Tool identifier (e.g. "auto_mesh"). */
  toolId: string;
  /** Tool version (e.g. "2.1.0"). */
  toolVersion: string;
  /** Last-known execution status, when the plan is mid-run. */
  stepStatus?: string;
  /** Per-node parameter map, exposed for property panels. */
  parameters?: Record<string, unknown>;
  /** Whether the node accepts user edits (drives editor affordances). */
  isEditable?: boolean;
  /** Whether the node is structurally required (cannot be removed). */
  isRequired?: boolean;
}

export type PlanFlowNode = ReactFlowNode<PlanFlowNodeData>;
export type PlanFlowEdge = ReactFlowEdge;

/** Plan node augmented with optional depends_on for legacy compatibility. */
type PlanNodeWithDeps = PlanNode & { depends_on?: string[] };

function humanizeNodeId(id: string): string {
  const out = id
    .replace(/^node_\d+_/, '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return out || id;
}

function deriveEdgesFromDependsOn(
  nodes: PlanNodeWithDeps[],
): { id: string; source: string; target: string }[] {
  const edges: { id: string; source: string; target: string }[] = [];
  nodes.forEach((node) => {
    (node.depends_on ?? []).forEach((parent) => {
      edges.push({
        id: `e-${parent}-${node.node_id}`,
        source: parent,
        target: node.node_id,
      });
    });
  });
  return edges;
}

/**
 * Convert an ExecutionPlan into ReactFlow nodes + edges, ready to feed
 * `<ReactFlow nodes={...} edges={...}/>`.
 *
 * Layout: depth-by-dependency, mirroring the workflow editor. The
 * resulting nodes have `type: 'planNode'` so callers must register the
 * matching custom node component (see `PlanDagView`).
 *
 * Edge resolution precedence:
 *   1. `plan.edges` if non-empty — used verbatim.
 *   2. `node.depends_on[]` — back-filled into edges.
 *   3. Empty array.
 */
export function planToFlow(
  plan: ExecutionPlan | null | undefined,
): { nodes: PlanFlowNode[]; edges: PlanFlowEdge[] } {
  if (!plan) return { nodes: [], edges: [] };

  const sourceNodes = (plan.nodes ?? []) as PlanNodeWithDeps[];

  // Step 1: edges. Prefer explicit, fall back to depends_on.
  const explicitEdges = Array.isArray(plan.edges) ? plan.edges : [];
  const rawEdges =
    explicitEdges.length > 0
      ? explicitEdges.map((e, i) => ({
          id: `pedge-${i}-${e.from_node_id}-${e.to_node_id}`,
          source: e.from_node_id,
          target: e.to_node_id,
        }))
      : deriveEdgesFromDependsOn(sourceNodes);

  // Step 2: layout. We need parents for each node; derive from rawEdges
  // so the placement matches the edges we will actually render.
  const parentsByNode = new Map<string, string[]>();
  rawEdges.forEach((e) => {
    const list = parentsByNode.get(e.target) ?? [];
    list.push(e.source);
    parentsByNode.set(e.target, list);
  });

  const layoutInputs = sourceNodes.map((n) => ({ id: n.node_id, ref: n }));
  const positions = autoLayoutByDepth(
    layoutInputs,
    (n) => parentsByNode.get(n.id) ?? [],
  );

  // Step 3: ReactFlow nodes.
  const flowNodes: PlanFlowNode[] = sourceNodes.map((n) => {
    const pos = positions.get(n.node_id) ?? { x: 80, y: 80 };
    const data: PlanFlowNodeData = {
      label: humanizeNodeId(n.node_id),
      role: n.role,
      toolId: n.tool_id,
      toolVersion: n.tool_version,
      stepStatus: n.status,
      parameters: n.parameters,
      isEditable: n.is_editable,
      isRequired: n.is_required,
    };
    return {
      id: n.node_id,
      type: 'planNode',
      position: pos,
      data,
      draggable: false,
      selectable: true,
    };
  });

  // Step 4: edges with consistent styling. Animate while executing.
  const animated = plan.status === 'executing';
  const flowEdges: PlanFlowEdge[] = rawEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    animated,
    style: { stroke: '#d0d0d0', strokeWidth: 1.5 },
  }));

  return { nodes: flowNodes, edges: flowEdges };
}
