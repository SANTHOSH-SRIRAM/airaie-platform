import { describe, it, expect } from 'vitest';
import { planToFlow } from './executionPlanLayout';
import type { ExecutionPlan, PlanNode, PlanNodeRole } from '@/types/plan';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function plan(overrides: Partial<ExecutionPlan>): ExecutionPlan {
  return {
    id: 'plan_test',
    card_id: 'card_test',
    pipeline_id: 'pipe_test',
    nodes: [],
    edges: [],
    bindings: {},
    expected_outputs: [],
    cost_estimate: 0,
    time_estimate: '0s',
    status: 'draft',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function node(
  id: string,
  role: PlanNodeRole = 'solve',
  extra: Partial<PlanNode> & { depends_on?: string[] } = {},
): PlanNode & { depends_on?: string[] } {
  return {
    node_id: id,
    tool_id: `tool_${id}`,
    tool_version: '1.0.0',
    role,
    parameters: {},
    is_editable: true,
    is_required: false,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('planToFlow', () => {
  it('returns empty graph for null/undefined plan', () => {
    expect(planToFlow(null)).toEqual({ nodes: [], edges: [] });
    expect(planToFlow(undefined)).toEqual({ nodes: [], edges: [] });
  });

  it('returns empty graph for plan with no nodes', () => {
    const result = planToFlow(plan({ nodes: [], edges: [] }));
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('lays out a linear chain with strictly increasing depth', () => {
    // a -> b -> c -> d, four columns
    const result = planToFlow(
      plan({
        nodes: [node('a'), node('b'), node('c'), node('d')],
        edges: [
          { from_node_id: 'a', to_node_id: 'b' },
          { from_node_id: 'b', to_node_id: 'c' },
          { from_node_id: 'c', to_node_id: 'd' },
        ],
      }),
    );

    expect(result.nodes).toHaveLength(4);
    expect(result.edges).toHaveLength(3);

    const xOf = (id: string) =>
      result.nodes.find((n) => n.id === id)!.position.x;

    expect(xOf('a')).toBeLessThan(xOf('b'));
    expect(xOf('b')).toBeLessThan(xOf('c'));
    expect(xOf('c')).toBeLessThan(xOf('d'));
  });

  it('places branches at the same depth as siblings', () => {
    // root -> { branchA, branchB } -> sink
    const result = planToFlow(
      plan({
        nodes: [
          node('root'),
          node('branchA'),
          node('branchB'),
          node('sink'),
        ],
        edges: [
          { from_node_id: 'root', to_node_id: 'branchA' },
          { from_node_id: 'root', to_node_id: 'branchB' },
          { from_node_id: 'branchA', to_node_id: 'sink' },
          { from_node_id: 'branchB', to_node_id: 'sink' },
        ],
      }),
    );

    const posOf = (id: string) => result.nodes.find((n) => n.id === id)!.position;
    expect(posOf('branchA').x).toBe(posOf('branchB').x);
    expect(posOf('branchA').y).not.toBe(posOf('branchB').y);
    expect(posOf('root').x).toBeLessThan(posOf('branchA').x);
    expect(posOf('sink').x).toBeGreaterThan(posOf('branchA').x);
  });

  it('uses explicit edges and ignores depends_on when both present', () => {
    // explicit edges say a->b only; depends_on claims b<-c — must be ignored
    const result = planToFlow(
      plan({
        nodes: [
          node('a'),
          node('b', 'solve', { depends_on: ['c'] }),
          node('c'),
        ],
        edges: [{ from_node_id: 'a', to_node_id: 'b' }],
      }),
    );

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe('a');
    expect(result.edges[0].target).toBe('b');
  });

  it('derives edges from depends_on when plan.edges is empty', () => {
    const result = planToFlow(
      plan({
        nodes: [
          node('a'),
          node('b', 'solve', { depends_on: ['a'] }),
          node('c', 'solve', { depends_on: ['b'] }),
        ],
        edges: [],
      }),
    );

    expect(result.edges).toHaveLength(2);
    const pairs = result.edges
      .map((e) => `${e.source}->${e.target}`)
      .sort();
    expect(pairs).toEqual(['a->b', 'b->c']);
  });

  it('derives edges from depends_on when plan.edges is missing', () => {
    // simulate a legacy/partial response with no edges field at all
    const result = planToFlow({
      ...plan({}),
      nodes: [
        node('a'),
        node('b', 'solve', { depends_on: ['a'] }),
      ],
      // @ts-expect-error — exercising the runtime tolerance for missing edges
      edges: undefined,
    });

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe('a');
    expect(result.edges[0].target).toBe('b');
  });

  it('animates edges when plan status is executing', () => {
    const result = planToFlow(
      plan({
        nodes: [node('a'), node('b')],
        edges: [{ from_node_id: 'a', to_node_id: 'b' }],
        status: 'executing',
      }),
    );
    expect(result.edges[0].animated).toBe(true);
  });

  it('does not animate edges when plan is in non-executing status', () => {
    const result = planToFlow(
      plan({
        nodes: [node('a'), node('b')],
        edges: [{ from_node_id: 'a', to_node_id: 'b' }],
        status: 'draft',
      }),
    );
    expect(result.edges[0].animated).toBe(false);
  });

  it('attaches role, toolId, toolVersion, stepStatus to node data', () => {
    const result = planToFlow(
      plan({
        nodes: [
          node('only', 'preprocess', {
            tool_id: 'auto_mesh',
            tool_version: '2.1.0',
            status: 'completed',
            parameters: { resolution: 'fine' },
            is_editable: false,
            is_required: true,
          }),
        ],
        edges: [],
      }),
    );

    const data = result.nodes[0].data;
    expect(data.role).toBe('preprocess');
    expect(data.toolId).toBe('auto_mesh');
    expect(data.toolVersion).toBe('2.1.0');
    expect(data.stepStatus).toBe('completed');
    expect(data.parameters).toEqual({ resolution: 'fine' });
    expect(data.isEditable).toBe(false);
    expect(data.isRequired).toBe(true);
    expect(data.label.length).toBeGreaterThan(0);
    expect(result.nodes[0].type).toBe('planNode');
    expect(result.nodes[0].draggable).toBe(false);
  });

  it('places isolated nodes (no edges) at depth 0 stacked vertically', () => {
    const result = planToFlow(
      plan({
        nodes: [node('a'), node('b'), node('c')],
        edges: [],
      }),
    );

    const xs = result.nodes.map((n) => n.position.x);
    expect(new Set(xs).size).toBe(1); // all on one column
    const ys = result.nodes.map((n) => n.position.y).sort((p, q) => p - q);
    // y values must be strictly increasing (siblings stacked)
    expect(ys[0]).toBeLessThan(ys[1]);
    expect(ys[1]).toBeLessThan(ys[2]);
  });
});
