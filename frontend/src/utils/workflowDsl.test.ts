import { describe, it, expect } from 'vitest';
import {
  decodeDsl,
  encodeDsl,
  dslToFlow,
  flowToDsl,
  normalizeRetryPolicyToDsl,
  normalizeRetryPolicyToUi,
  uiNodeTypeToDsl,
  type WorkflowDsl,
  type WorkflowDslNode,
  type WorkflowFlowEdge,
  type WorkflowFlowNode,
} from './workflowDsl';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function emptyDsl(): WorkflowDsl {
  return { kind: 'workflow', version: 1, nodes: [], edges: [] };
}

/** Strip volatile fields that don't survive a meaningful round-trip. */
function normaliseEdges(edges: { id: string; source: string; target: string }[]) {
  return edges
    .map((e) => ({ id: e.id, source: e.source, target: e.target }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

// ---------------------------------------------------------------------------
// Empty / smoke
// ---------------------------------------------------------------------------

describe('decodeDsl / encodeDsl', () => {
  it('returns null for empty input', () => {
    expect(decodeDsl(undefined)).toBeNull();
    expect(decodeDsl(null)).toBeNull();
    expect(decodeDsl('')).toBeNull();
  });

  it('returns null for invalid base64', () => {
    expect(decodeDsl('!!!not base64!!!')).toBeNull();
  });

  it('returns null for valid base64 but non-JSON', () => {
    expect(decodeDsl(btoa('not-json'))).toBeNull();
  });

  it('returns null for JSON that is not an object', () => {
    expect(decodeDsl(btoa(JSON.stringify([1, 2, 3])))).toBeNull();
    expect(decodeDsl(btoa(JSON.stringify('hello')))).toBeNull();
  });

  it('round-trips a DSL value through encode/decode', () => {
    const dsl: WorkflowDsl = {
      kind: 'workflow',
      version: 1,
      metadata: { name: 'demo' },
      config: { parallelism: 4 },
      nodes: [
        { id: 'a', type: 'tool', subtype: 'fea-solver', tool: 'fea-solver@2.1.0' },
      ],
      edges: [],
    };
    const round = decodeDsl(encodeDsl(dsl));
    expect(round).not.toBeNull();
    expect(round!.nodes).toHaveLength(1);
    expect(round!.nodes[0]).toMatchObject({
      id: 'a',
      type: 'tool',
      tool: 'fea-solver@2.1.0',
    });
  });

  it('handles utf-8 in node labels (encoding path is unicode-safe)', () => {
    const dsl: WorkflowDsl = {
      kind: 'workflow',
      version: 1,
      nodes: [{ id: 'a', type: 'tool', label: 'Solver — beam (μ-strain)' }],
      edges: [],
    };
    const round = decodeDsl(encodeDsl(dsl));
    expect(round!.nodes[0].label).toBe('Solver — beam (μ-strain)');
  });
});

describe('dslToFlow / flowToDsl — empty graph', () => {
  it('empty DSL produces empty graph', () => {
    const result = dslToFlow(emptyDsl());
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.metadata).toEqual({});
  });

  it('empty graph produces empty DSL', () => {
    const dsl = flowToDsl({ nodes: [], edges: [], metadata: { name: 'x' } });
    expect(dsl.nodes).toEqual([]);
    expect(dsl.edges).toEqual([]);
    expect(dsl.metadata).toEqual({ name: 'x' });
    expect(dsl.kind).toBe('workflow');
    expect(dsl.version).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Forward conversion: DSL -> ReactFlow
// ---------------------------------------------------------------------------

describe('dslToFlow', () => {
  it('converts a single Tool node with no edges', () => {
    const dsl: WorkflowDsl = {
      nodes: [
        {
          id: 'solve',
          type: 'tool',
          subtype: 'fea-solver',
          tool: 'fea-solver@2.1.0',
          inputs: { mesh_file: '$inputs.mesh' },
        },
      ],
    };
    const { nodes, edges } = dslToFlow(dsl);
    expect(nodes).toHaveLength(1);
    expect(edges).toEqual([]);
    expect(nodes[0]).toMatchObject({
      id: 'solve',
      type: 'tool',
      data: {
        label: 'Solve',
        subtype: 'fea-solver',
        nodeType: 'tool',
        inputs: { mesh_file: '$inputs.mesh' },
        tool: 'fea-solver@2.1.0',
      },
    });
    // Auto-layout assigns a default position.
    expect(typeof nodes[0].position.x).toBe('number');
    expect(typeof nodes[0].position.y).toBe('number');
  });

  it('handles a linear DAG (Trigger -> Tool -> Tool) via depends_on backfill', () => {
    const dsl: WorkflowDsl = {
      nodes: [
        { id: 'start', type: 'trigger', subtype: 'manual' },
        { id: 'mesh', type: 'tool', subtype: 'mesh-generator', depends_on: ['start'] },
        { id: 'solve', type: 'tool', subtype: 'fea-solver', depends_on: ['mesh'] },
      ],
    };
    const { nodes, edges } = dslToFlow(dsl);
    expect(nodes.map((n) => n.id)).toEqual(['start', 'mesh', 'solve']);
    expect(normaliseEdges(edges)).toEqual([
      { id: 'e-mesh-solve', source: 'mesh', target: 'solve' },
      { id: 'e-start-mesh', source: 'start', target: 'mesh' },
    ]);
    // Depth layout: start at depth 0, mesh at 1, solve at 2.
    const xs = nodes.map((n) => n.position.x).sort((a, b) => a - b);
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
  });

  it('handles a branching DAG (Tool -> Gate -> {Tool, Tool})', () => {
    const dsl: WorkflowDsl = {
      nodes: [
        { id: 'pre', type: 'tool', subtype: 'mesh-generator' },
        { id: 'gate', type: 'gate', subtype: 'approval-gate', depends_on: ['pre'] },
        { id: 'left', type: 'tool', subtype: 'fea-solver', depends_on: ['gate'] },
        { id: 'right', type: 'tool', subtype: 'cfd-engine', depends_on: ['gate'] },
      ],
    };
    const { nodes, edges } = dslToFlow(dsl);
    expect(nodes).toHaveLength(4);
    expect(normaliseEdges(edges)).toEqual(
      normaliseEdges([
        { id: 'e-pre-gate', source: 'pre', target: 'gate' },
        { id: 'e-gate-left', source: 'gate', target: 'left' },
        { id: 'e-gate-right', source: 'gate', target: 'right' },
      ]),
    );
  });

  it('renders all 7 node types in one graph', () => {
    const dsl: WorkflowDsl = {
      nodes: [
        { id: 'n1', type: 'trigger', subtype: 'webhook' },
        { id: 'n2', type: 'tool', subtype: 'fea-solver', depends_on: ['n1'] },
        { id: 'n3', type: 'agent', subtype: 'ai-optimizer', depends_on: ['n2'] },
        { id: 'n4', type: 'logic', subtype: 'condition', depends_on: ['n3'] },
        { id: 'n5', type: 'gate', subtype: 'approval-gate', depends_on: ['n4'] },
        { id: 'n6', type: 'data', subtype: 'artifact-store', depends_on: ['n5'] },
        { id: 'n7', type: 'stickyNote', text: 'remember to revisit' },
      ],
    };
    const { nodes } = dslToFlow(dsl);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    expect(byId.n1.type).toBe('trigger');
    expect(byId.n2.type).toBe('tool');
    expect(byId.n3.type).toBe('agent');
    expect(byId.n4.type).toBe('logic');
    expect(byId.n5.type).toBe('gate');
    expect(byId.n6.type).toBe('data');
    expect(byId.n7.type).toBe('stickyNote');
    expect(byId.n7.data.text).toBe('remember to revisit');
  });

  it('preserves explicit positions instead of auto-layout', () => {
    const dsl: WorkflowDsl = {
      nodes: [
        { id: 'a', type: 'tool', position: { x: 1234, y: 5678 } },
      ],
    };
    const { nodes } = dslToFlow(dsl);
    expect(nodes[0].position).toEqual({ x: 1234, y: 5678 });
  });

  it('prefers explicit edges over depends_on backfill', () => {
    const dsl: WorkflowDsl = {
      nodes: [
        { id: 'a', type: 'tool' },
        { id: 'b', type: 'tool', depends_on: ['a'] },
      ],
      edges: [
        { id: 'custom-edge', source: 'a', target: 'b', sourceHandle: 'outputs/main/0', targetHandle: 'inputs/main/0' },
      ],
    };
    const { edges } = dslToFlow(dsl);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      id: 'custom-edge',
      source: 'a',
      target: 'b',
      sourceHandle: 'outputs/main/0',
      targetHandle: 'inputs/main/0',
    });
  });

  it('throws on an unknown node type', () => {
    const dsl = {
      nodes: [{ id: 'x', type: 'wat' }],
    } as unknown as WorkflowDsl;
    expect(() => dslToFlow(dsl)).toThrow(/unknown node type/i);
  });

  it('throws when a node lacks an id', () => {
    const dsl = {
      nodes: [{ type: 'tool' }],
    } as unknown as WorkflowDsl;
    expect(() => dslToFlow(dsl)).toThrow(/string id/i);
  });

  it('preserves expression strings verbatim in inputs', () => {
    const expr = "{{ $('mesh').json.element_count }}";
    const dsl: WorkflowDsl = {
      nodes: [
        { id: 'solve', type: 'tool', inputs: { count: expr } },
      ],
    };
    const { nodes } = dslToFlow(dsl);
    expect(nodes[0].data.inputs.count).toBe(expr);
  });
});

// ---------------------------------------------------------------------------
// Inverse conversion: ReactFlow -> DSL
// ---------------------------------------------------------------------------

describe('flowToDsl', () => {
  it('emits canonical kind/version', () => {
    const dsl = flowToDsl({ nodes: [], edges: [] });
    expect(dsl.kind).toBe('workflow');
    expect(dsl.version).toBe(1);
  });

  it('converts a flow node back to DSL with its type-specific fields', () => {
    const flow: { nodes: WorkflowFlowNode[]; edges: WorkflowFlowEdge[] } = {
      nodes: [
        {
          id: 'solve',
          type: 'tool',
          position: { x: 100, y: 200 },
          data: {
            label: 'Solver',
            subtype: 'fea-solver',
            nodeType: 'tool',
            inputs: { count: 42 },
            tool: 'fea-solver@2.1.0',
            timeout: 600,
          },
        },
      ],
      edges: [],
    };
    const dsl = flowToDsl(flow);
    expect(dsl.nodes).toHaveLength(1);
    const n = dsl.nodes[0];
    expect(n.type).toBe('tool');
    expect(n.position).toEqual({ x: 100, y: 200 });
    if (n.type === 'tool') {
      expect(n.tool).toBe('fea-solver@2.1.0');
      expect(n.timeout).toBe(600);
    }
  });

  it('preserves sticky-note width/height + text', () => {
    const flow = {
      nodes: [
        {
          id: 'note',
          type: 'stickyNote' as const,
          position: { x: 0, y: 0 },
          width: 220,
          height: 140,
          data: {
            label: '',
            subtype: 'stickyNote',
            nodeType: 'stickyNote' as const,
            inputs: {},
            text: 'TODO: add evidence gate',
          },
        },
      ],
      edges: [] as WorkflowFlowEdge[],
    };
    const dsl = flowToDsl(flow);
    const n = dsl.nodes[0];
    if (n.type === 'stickyNote') {
      expect(n.text).toBe('TODO: add evidence gate');
      expect(n.width).toBe(220);
      expect(n.height).toBe(140);
    } else {
      throw new Error('expected stickyNote');
    }
  });

  it('throws on unknown node type', () => {
    const flow = {
      nodes: [
        {
          id: 'x',
          type: 'tool',
          position: { x: 0, y: 0 },
          data: { label: 'x', subtype: 'x', nodeType: 'wat', inputs: {} },
        } as unknown as WorkflowFlowNode,
      ],
      edges: [] as WorkflowFlowEdge[],
    };
    expect(() => flowToDsl(flow)).toThrow(/unknown node type/i);
  });
});

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

describe('round-trip flowToDsl(dslToFlow(dsl))', () => {
  function normalise(dsl: WorkflowDsl): WorkflowDsl {
    // Drop fields that the legacy depends_on path would shed on the
    // first round-trip: the inverse converter never re-emits depends_on.
    const stripped: WorkflowDslNode[] = dsl.nodes.map((n) => {
      const { depends_on: _omit, ...rest } = n;
      void _omit;
      return rest as WorkflowDslNode;
    });
    return {
      kind: dsl.kind ?? 'workflow',
      version: dsl.version ?? 1,
      metadata: dsl.metadata ?? {},
      nodes: stripped,
      edges: dsl.edges ?? [],
    };
  }

  function fixtures(): WorkflowDsl[] {
    // Realistic fixtures must carry an explicit `label` per node;
    // omitting it would force `dslToFlow` to derive one via
    // `humanizeNodeId`, which the inverse converter then surfaces and
    // would break bit-exact round-tripping. Saved workflows always
    // have labels, so this matches production data.
    return [
      // 1. Simple linear DAG with explicit edges + positions.
      {
        kind: 'workflow',
        version: 1,
        metadata: { name: 'linear' },
        nodes: [
          { id: 'start', type: 'trigger', label: 'Start', subtype: 'manual', position: { x: 0, y: 0 }, inputs: {} },
          { id: 'tool', type: 'tool', label: 'Solver', subtype: 'fea-solver', position: { x: 220, y: 0 }, inputs: { x: 1 }, tool: 'fea-solver@2.1.0' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'tool' },
        ],
      },
      // 2. All seven types, fully positioned, with explicit edges.
      {
        kind: 'workflow',
        version: 1,
        metadata: {},
        nodes: [
          { id: 't', type: 'trigger', label: 'Webhook', subtype: 'webhook', position: { x: 0, y: 0 }, inputs: { endpoint: '/run' } },
          { id: 'm', type: 'tool', label: 'Mesh', subtype: 'mesh-generator', position: { x: 220, y: 0 }, inputs: {} },
          { id: 's', type: 'tool', label: 'Solve', subtype: 'fea-solver', position: { x: 440, y: 0 }, inputs: {}, tool: 'fea-solver@2.1.0', timeout: 300 },
          { id: 'a', type: 'agent', label: 'Optimize', subtype: 'ai-optimizer', position: { x: 660, y: 0 }, inputs: { goal: 'minimize mass' }, agent: 'ai-optimizer@1.0' },
          { id: 'l', type: 'logic', label: 'Condition', subtype: 'condition', position: { x: 880, y: 0 }, inputs: { expression: 'a.json.ok' } },
          { id: 'g', type: 'gate', label: 'Approve', subtype: 'approval-gate', position: { x: 1100, y: 0 }, inputs: { approvers: 'lead' } },
          { id: 'd', type: 'data', label: 'Store', subtype: 'artifact-store', position: { x: 1320, y: 0 }, inputs: { operation: 'store' } },
          { id: 'note', type: 'stickyNote', label: 'Note', subtype: 'stickyNote', position: { x: 0, y: 200 }, inputs: {}, text: 'remember' },
        ],
        edges: [
          { id: 'e-t-m', source: 't', target: 'm' },
          { id: 'e-m-s', source: 'm', target: 's' },
          { id: 'e-s-a', source: 's', target: 'a' },
          { id: 'e-a-l', source: 'a', target: 'l' },
          { id: 'e-l-g', source: 'l', target: 'g' },
          { id: 'e-g-d', source: 'g', target: 'd' },
        ],
      },
      // 3. Branching DAG with handles.
      {
        kind: 'workflow',
        version: 1,
        metadata: {},
        nodes: [
          { id: 'cond', type: 'logic', label: 'Cond', subtype: 'condition', position: { x: 0, y: 0 }, inputs: { expression: 'x > 0' } },
          { id: 'left', type: 'tool', label: 'Left', subtype: 'fea-solver', position: { x: 220, y: 0 }, inputs: {} },
          { id: 'right', type: 'tool', label: 'Right', subtype: 'cfd-engine', position: { x: 220, y: 200 }, inputs: {} },
        ],
        edges: [
          { id: 'e-cond-left', source: 'cond', target: 'left', sourceHandle: 'outputs/main/0', targetHandle: 'inputs/main/0' },
          { id: 'e-cond-right', source: 'cond', target: 'right', sourceHandle: 'outputs/main/1', targetHandle: 'inputs/main/0' },
        ],
      },
    ];
  }

  it.each(fixtures())('round-trips fixture %#', (dsl) => {
    const flow = dslToFlow(dsl);
    const back = flowToDsl({
      nodes: flow.nodes,
      edges: flow.edges,
      metadata: flow.metadata,
    });
    expect(normalise(back)).toEqual(normalise(dsl));
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility
// ---------------------------------------------------------------------------

describe('backward compatibility: depends_on -> edges', () => {
  it('back-fills edges for legacy DSL with no edges array', () => {
    const dsl: WorkflowDsl = {
      nodes: [
        { id: 'a', type: 'tool' },
        { id: 'b', type: 'tool', depends_on: ['a'] },
        { id: 'c', type: 'tool', depends_on: ['a', 'b'] },
      ],
    };
    const { edges } = dslToFlow(dsl);
    expect(normaliseEdges(edges)).toEqual(
      normaliseEdges([
        { id: 'e-a-b', source: 'a', target: 'b' },
        { id: 'e-a-c', source: 'a', target: 'c' },
        { id: 'e-b-c', source: 'b', target: 'c' },
      ]),
    );
  });

  it('decodes a legacy base64 blob with only nodes + depends_on', () => {
    const legacy = btoa(
      JSON.stringify({
        kind: 'workflow',
        nodes: [
          { id: 'a', tool: 'mesh@1.0' },
          { id: 'b', tool: 'fea@2.0', depends_on: ['a'] },
        ],
      }),
    );
    const dsl = decodeDsl(legacy);
    expect(dsl).not.toBeNull();
    // Note: legacy nodes lack an explicit `type` field. We decode them
    // verbatim — `dslToFlow` is the boundary that enforces type
    // validity, so legacy callers must enrich nodes (e.g. infer
    // type='tool' when `tool` is set) before passing to `dslToFlow`.
    expect(dsl!.nodes).toHaveLength(2);
    expect(dsl!.nodes[1].depends_on).toEqual(['a']);
  });
});

// ---------------------------------------------------------------------------
// Field-name normalisation (UI <-> DSL)
// ---------------------------------------------------------------------------

describe('normalizeRetryPolicyToDsl', () => {
  it('maps UI shape to kernel shape', () => {
    expect(normalizeRetryPolicyToDsl({ maxRetries: 3, waitBetweenSeconds: 2 })).toEqual({
      max_attempts: 3,
      delay_ms: 2000,
    });
  });

  it('rounds fractional seconds to milliseconds', () => {
    expect(normalizeRetryPolicyToDsl({ maxRetries: 1, waitBetweenSeconds: 1.5 })).toEqual({
      max_attempts: 1,
      delay_ms: 1500,
    });
  });

  it('returns undefined when the policy is missing', () => {
    expect(normalizeRetryPolicyToDsl(undefined)).toBeUndefined();
  });
});

describe('normalizeRetryPolicyToUi', () => {
  it('reverses the kernel shape', () => {
    expect(normalizeRetryPolicyToUi({ max_attempts: 5, delay_ms: 250 })).toEqual({
      maxRetries: 5,
      waitBetweenSeconds: 0.25,
    });
  });

  it('passes through legacy UI shapes unchanged', () => {
    expect(normalizeRetryPolicyToUi({ maxRetries: 2, waitBetweenSeconds: 4 })).toEqual({
      maxRetries: 2,
      waitBetweenSeconds: 4,
    });
  });

  it('returns undefined for non-objects', () => {
    expect(normalizeRetryPolicyToUi(null)).toBeUndefined();
    expect(normalizeRetryPolicyToUi(undefined)).toBeUndefined();
    expect(normalizeRetryPolicyToUi('foo')).toBeUndefined();
  });
});

describe('uiNodeTypeToDsl', () => {
  it('maps governance to gate', () => {
    expect(uiNodeTypeToDsl('governance')).toBe('gate');
  });

  it('passes through canonical types', () => {
    expect(uiNodeTypeToDsl('tool')).toBe('tool');
    expect(uiNodeTypeToDsl('agent')).toBe('agent');
    expect(uiNodeTypeToDsl('gate')).toBe('gate');
  });
});

describe('flowToDsl normalisation', () => {
  it('rewrites governance to gate on the wire', () => {
    const flowNode: WorkflowFlowNode = {
      id: 'g1',
      type: 'gate',
      position: { x: 0, y: 0 },
      data: {
        label: 'Approval',
        subtype: 'approval-gate',
        // UI's NodeCategories emits 'governance'.
        nodeType: 'governance' as never,
        inputs: {},
      },
    };
    const dsl = flowToDsl({ nodes: [flowNode], edges: [] });
    expect(dsl.nodes[0].type).toBe('gate');
  });

  it('rewrites retryPolicy from UI to kernel shape', () => {
    const flowNode: WorkflowFlowNode = {
      id: 't1',
      type: 'tool',
      position: { x: 0, y: 0 },
      data: {
        label: 'FEA',
        subtype: 'fea-solver',
        nodeType: 'tool',
        inputs: {},
        retryPolicy: { maxRetries: 4, waitBetweenSeconds: 0.5 },
      },
    };
    const dsl = flowToDsl({ nodes: [flowNode], edges: [] });
    expect((dsl.nodes[0] as { retryPolicy?: unknown }).retryPolicy).toEqual({
      max_attempts: 4,
      delay_ms: 500,
    });
  });
});

describe('dslToFlow normalisation', () => {
  it('reads kernel-shape retryPolicy back into UI shape', () => {
    const dsl: WorkflowDsl = {
      kind: 'workflow',
      version: 1,
      nodes: [
        {
          id: 't1',
          type: 'tool',
          subtype: 'fea-solver',
          inputs: {},
          // Kernel shape coming from the wire.
          retryPolicy: { max_attempts: 4, delay_ms: 500 } as unknown as { maxRetries: number; waitBetweenSeconds: number },
        } as WorkflowDslNode,
      ],
      edges: [],
    };
    const { nodes } = dslToFlow(dsl);
    expect(nodes[0].data.retryPolicy).toEqual({ maxRetries: 4, waitBetweenSeconds: 0.5 });
  });
});
