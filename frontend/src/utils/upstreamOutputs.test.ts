import { describe, it, expect } from 'vitest';
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import { getUpstreamOutputs } from './upstreamOutputs';

interface PortDecl {
  name: string;
  type?: string;
}

/** Helper to build a minimal ReactFlow node with declared output ports. */
function makeNode(
  id: string,
  label: string,
  outputs: PortDecl[] = [],
): ReactFlowNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { label, outputs },
  };
}

function makeEdge(source: string, target: string): ReactFlowEdge {
  return { id: `e-${source}-${target}`, source, target };
}

describe('getUpstreamOutputs', () => {
  it('returns no suggestions for an empty graph', () => {
    expect(getUpstreamOutputs('A', [], [])).toEqual([]);
  });

  it('returns no suggestions when the current node has no parents', () => {
    const nodes = [
      makeNode('A', 'Alpha', [{ name: 'out1', type: 'artifact' }]),
    ];
    expect(getUpstreamOutputs('A', nodes, [])).toEqual([]);
  });

  it('returns no suggestions when currentNodeId is empty', () => {
    const nodes = [makeNode('A', 'Alpha', [{ name: 'out1' }])];
    expect(getUpstreamOutputs('', nodes, [])).toEqual([]);
  });

  it('linear chain A -> B -> C: from C, suggests A and B outputs in topo order', () => {
    const nodes = [
      makeNode('A', 'Alpha', [{ name: 'a_out', type: 'artifact' }]),
      makeNode('B', 'Bravo', [{ name: 'b_out', type: 'parameter' }]),
      makeNode('C', 'Charlie', [{ name: 'c_out', type: 'metric' }]),
    ];
    const edges = [makeEdge('A', 'B'), makeEdge('B', 'C')];

    const suggestions = getUpstreamOutputs('C', nodes, edges);

    // Closest first: B then A. Current node C must NOT be present.
    expect(suggestions.map((s) => s.nodeId)).toEqual(['B', 'A']);
    expect(suggestions[0]).toMatchObject({
      nodeId: 'B',
      nodeName: 'Bravo',
      port: 'b_out',
      type: 'parameter',
      expression: "$('Bravo').json.b_out",
    });
    expect(suggestions[1].expression).toBe("$('Alpha').json.a_out");
  });

  it('does not include descendants of the current node', () => {
    const nodes = [
      makeNode('A', 'Alpha', [{ name: 'a_out' }]),
      makeNode('B', 'Bravo', [{ name: 'b_out' }]),
      makeNode('C', 'Charlie', [{ name: 'c_out' }]),
    ];
    // A -> B -> C; querying B should suggest A only.
    const edges = [makeEdge('A', 'B'), makeEdge('B', 'C')];

    const suggestions = getUpstreamOutputs('B', nodes, edges);

    expect(suggestions.map((s) => s.nodeId)).toEqual(['A']);
  });

  it('branching: A -> {B, C}, B -> D, C -> D — from D, suggests A, B, C', () => {
    const nodes = [
      makeNode('A', 'Alpha', [{ name: 'a_out', type: 'artifact' }]),
      makeNode('B', 'Bravo', [{ name: 'b_out' }]),
      makeNode('C', 'Charlie', [{ name: 'c_out' }]),
      makeNode('D', 'Delta', [{ name: 'd_out' }]),
    ];
    const edges = [
      makeEdge('A', 'B'),
      makeEdge('A', 'C'),
      makeEdge('B', 'D'),
      makeEdge('C', 'D'),
    ];

    const suggestions = getUpstreamOutputs('D', nodes, edges);

    // Depth-1 parents come first (B, C alphabetically), then depth-2 (A).
    expect(suggestions.map((s) => s.nodeId)).toEqual(['B', 'C', 'A']);
    expect(suggestions.map((s) => s.expression)).toEqual([
      "$('Bravo').json.b_out",
      "$('Charlie').json.c_out",
      "$('Alpha').json.a_out",
    ]);
  });

  it('handles multiple output ports per ancestor node', () => {
    const nodes = [
      makeNode('A', 'Alpha', [
        { name: 'mesh', type: 'artifact' },
        { name: 'stats', type: 'metric' },
      ]),
      makeNode('B', 'Bravo'),
    ];
    const edges = [makeEdge('A', 'B')];

    const suggestions = getUpstreamOutputs('B', nodes, edges);

    expect(suggestions).toHaveLength(2);
    expect(suggestions.map((s) => s.port)).toEqual(['mesh', 'stats']);
    expect(suggestions[0].type).toBe('artifact');
    expect(suggestions[1].type).toBe('metric');
  });

  it('survives a cycle without crashing and produces deterministic output', () => {
    const nodes = [
      makeNode('A', 'Alpha', [{ name: 'a_out' }]),
      makeNode('B', 'Bravo', [{ name: 'b_out' }]),
      makeNode('C', 'Charlie', [{ name: 'c_out' }]),
    ];
    // A -> B -> C -> A (cycle), querying from C.
    const edges = [makeEdge('A', 'B'), makeEdge('B', 'C'), makeEdge('C', 'A')];

    const suggestions = getUpstreamOutputs('C', nodes, edges);

    // Each ancestor visited exactly once; no infinite loop.
    const ids = suggestions.map((s) => s.nodeId);
    expect(new Set(ids).size).toBe(ids.length);
    // C itself never suggested.
    expect(ids).not.toContain('C');
    // A and B are reachable upstream from C in this cycle.
    expect(ids).toContain('A');
    expect(ids).toContain('B');
  });

  it('skips ancestor nodes whose outputs are missing or empty', () => {
    const nodes = [
      makeNode('A', 'Alpha', []), // no outputs
      makeNode('B', 'Bravo', [{ name: 'b_out' }]),
      // Node with non-array data.outputs to exercise the duck-type guard.
      {
        id: 'X',
        position: { x: 0, y: 0 },
        data: { label: 'Xenon', outputs: 'not-an-array' as unknown },
      } as ReactFlowNode,
      makeNode('C', 'Charlie'),
    ];
    const edges = [
      makeEdge('A', 'C'),
      makeEdge('B', 'C'),
      makeEdge('X', 'C'),
    ];

    const suggestions = getUpstreamOutputs('C', nodes, edges);

    expect(suggestions.map((s) => s.nodeId)).toEqual(['B']);
  });

  it('skips port entries with non-string or missing name', () => {
    const nodes = [
      makeNode('A', 'Alpha', [
        { name: '' },
        // @ts-expect-error - exercising bad shape on purpose
        { name: 42 },
        { name: 'real_port', type: 'artifact' },
      ]),
      makeNode('B', 'Bravo'),
    ];
    const edges = [makeEdge('A', 'B')];

    const suggestions = getUpstreamOutputs('B', nodes, edges);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].port).toBe('real_port');
  });

  it('falls back to nodeId when label is missing or empty', () => {
    const nodes = [
      // Node with empty label.
      {
        id: 'node_1',
        position: { x: 0, y: 0 },
        data: { label: '', outputs: [{ name: 'p' }] },
      } as ReactFlowNode,
      makeNode('B', 'Bravo'),
    ];
    const edges = [makeEdge('node_1', 'B')];

    const [s] = getUpstreamOutputs('B', nodes, edges);
    expect(s.nodeName).toBe('node_1');
    expect(s.expression).toBe("$('node_1').json.p");
  });

  it('ignores edges whose source/target nodes are missing from the node map', () => {
    const nodes = [makeNode('B', 'Bravo')];
    const edges = [makeEdge('GHOST', 'B')];

    expect(getUpstreamOutputs('B', nodes, edges)).toEqual([]);
  });
});
