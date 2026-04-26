/**
 * Upstream-output resolver for the workflow editor.
 *
 * Given a target node, walks the graph upstream (against the edge direction)
 * and collects every declared output port from every ancestor. Used by the
 * expression autocomplete inside the parameter inputs.
 *
 * The function is pure — pass nodes and edges in. No store access, no
 * React imports.
 */

import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';

/** A single suggestion shown in the expression autocomplete popover. */
export interface UpstreamOutputSuggestion {
  /** Canonical node id (e.g. "node_2_solver"). */
  nodeId: string;
  /** Human-readable display label, falls back to nodeId. */
  nodeName: string;
  /** Output port name, sourced from `node.data.outputs[]`. */
  port: string;
  /** Optional port type ("artifact" | "parameter" | "metric"). */
  type?: string;
  /** Ready-to-insert expression body (without the surrounding `{{ }}`). */
  expression: string;
}

/** Shape we duck-type against `node.data.outputs[]` entries. */
interface DeclaredPort {
  name?: unknown;
  type?: unknown;
}

/** Read the output port array off a node, tolerating multiple shapes. */
function readDeclaredOutputs(node: ReactFlowNode): DeclaredPort[] {
  const data = (node.data ?? {}) as Record<string, unknown>;
  const raw = data.outputs;
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is DeclaredPort => typeof p === 'object' && p !== null);
}

/** Read a human display label off a node, falling back to the node id. */
function readNodeName(node: ReactFlowNode): string {
  const data = (node.data ?? {}) as Record<string, unknown>;
  const label = data.label;
  if (typeof label === 'string' && label.trim().length > 0) return label;
  return node.id;
}

/**
 * Build the set of node ids reachable upstream from `currentNodeId`
 * (exclusive of the node itself). Cycle-safe via a visited set.
 *
 * Returns an array sorted by topological depth (closest ancestor first),
 * with deterministic ordering for ties (alphabetical by nodeName).
 */
function collectAncestors(
  currentNodeId: string,
  nodesById: Map<string, ReactFlowNode>,
  parentsById: Map<string, string[]>,
): { nodeId: string; depth: number }[] {
  const seen = new Set<string>();
  const out: { nodeId: string; depth: number }[] = [];

  // BFS. Each layer is a depth.
  let frontier: string[] = parentsById.get(currentNodeId) ?? [];
  let depth = 1;
  // Avoid infinite loops if the seed list contains the current node.
  seen.add(currentNodeId);

  while (frontier.length > 0) {
    const nextFrontier: string[] = [];
    for (const id of frontier) {
      if (seen.has(id)) continue;
      seen.add(id);
      // Only keep ids that exist in the node map; orphan edges are ignored.
      if (nodesById.has(id)) {
        out.push({ nodeId: id, depth });
      }
      const parents = parentsById.get(id);
      if (parents && parents.length > 0) nextFrontier.push(...parents);
    }
    frontier = nextFrontier;
    depth += 1;
  }

  return out;
}

/**
 * Compute the list of upstream output suggestions for a given node.
 *
 * Walks the edge graph upstream from `currentNodeId`, then for each ancestor
 * flattens its declared output ports into autocomplete suggestions.
 *
 * Sort order: topological depth ascending (closest parent first), then
 * by node name alphabetical, then by port name.
 *
 * Empty graph, missing node, or no ancestors with output ports → returns [].
 */
export function getUpstreamOutputs(
  currentNodeId: string,
  allNodes: ReactFlowNode[],
  allEdges: ReactFlowEdge[],
): UpstreamOutputSuggestion[] {
  if (!currentNodeId) return [];

  const nodesById = new Map<string, ReactFlowNode>();
  for (const n of allNodes) nodesById.set(n.id, n);

  // parentsById[child] = [parent ids]. Source connects INTO target.
  const parentsById = new Map<string, string[]>();
  for (const e of allEdges) {
    if (!e.source || !e.target) continue;
    const arr = parentsById.get(e.target);
    if (arr) arr.push(e.source);
    else parentsById.set(e.target, [e.source]);
  }

  const ancestors = collectAncestors(currentNodeId, nodesById, parentsById);

  // Stable secondary sort: by nodeName, then port name.
  ancestors.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    const an = readNodeName(nodesById.get(a.nodeId) as ReactFlowNode);
    const bn = readNodeName(nodesById.get(b.nodeId) as ReactFlowNode);
    return an.localeCompare(bn);
  });

  const suggestions: UpstreamOutputSuggestion[] = [];
  for (const { nodeId } of ancestors) {
    const node = nodesById.get(nodeId);
    if (!node) continue;
    const nodeName = readNodeName(node);
    const ports = readDeclaredOutputs(node);
    for (const port of ports) {
      const portName = typeof port.name === 'string' ? port.name : '';
      if (!portName) continue;
      const portType = typeof port.type === 'string' ? port.type : undefined;
      suggestions.push({
        nodeId,
        nodeName,
        port: portName,
        type: portType,
        expression: `$('${nodeName}').json.${portName}`,
      });
    }
  }

  return suggestions;
}
