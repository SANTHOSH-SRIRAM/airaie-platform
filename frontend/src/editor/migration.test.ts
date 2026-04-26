import { describe, it, expect } from 'vitest';
import { generateDefaultBody, type GenerateDefaultBodyArgs } from './migration';
import type { Card, CardEvidence } from '@/types/card';
import type { IntentSpec, AcceptanceCriterion, IntentInput } from '@/types/intent';
import type { ExecutionPlan } from '@/types/plan';
import type { Gate } from '@/types/gate';

// ── Test fixtures ──────────────────────────────────────────────────────────

const baseCard: Card = {
  id: 'card_test',
  board_id: 'brd_test',
  card_type: 'analysis',
  title: 'Test Card',
  description: '',
  status: 'draft',
  ordinal: 1,
  kpis: [],
  created_at: '2026-04-25T00:00:00Z',
  updated_at: '2026-04-25T00:00:00Z',
};

function makeIntent(overrides?: Partial<IntentSpec>): IntentSpec {
  return {
    id: 'int_test',
    board_id: 'brd_test',
    intent_type: 'cae.fea',
    version: 1,
    goal: 'Run FEA',
    inputs: [],
    acceptance_criteria: [],
    status: 'draft',
    created_at: '2026-04-25T00:00:00Z',
    updated_at: '2026-04-25T00:00:00Z',
    ...overrides,
  };
}

function makeInput(name: string, artifact_ref?: string): IntentInput {
  return { name, artifact_ref, required: true };
}

function makeCriterion(metric: string, op: AcceptanceCriterion['operator'], threshold: unknown): AcceptanceCriterion {
  return { id: `crit_${metric}`, metric, operator: op, threshold };
}

function makePlan(id = 'plan_test'): ExecutionPlan {
  return {
    id,
    card_id: 'card_test',
    pipeline_id: 'pipe_test',
    nodes: [],
    edges: [],
    bindings: {},
    expected_outputs: [],
    cost_estimate: 0,
    time_estimate: '0s',
    status: 'draft',
    created_at: '2026-04-25T00:00:00Z',
    updated_at: '2026-04-25T00:00:00Z',
  };
}

function makeEvidence(overrides: Partial<CardEvidence>): CardEvidence {
  return {
    id: 'cevd_test',
    card_id: 'card_test',
    metric_key: 'metric',
    metric_value: 1,
    evaluation: 'pass',
    version: 1,
    created_at: '2026-04-25T00:00:00Z',
    ...overrides,
  };
}

function makeGate(id = 'gate_test'): Gate {
  return {
    id,
    board_id: 'brd_test',
    project_id: 'prj_test',
    name: 'Test Gate',
    gate_type: 'evidence',
    status: 'PENDING',
    created_at: '2026-04-25T00:00:00Z',
    updated_at: '2026-04-25T00:00:00Z',
  };
}

function args(overrides?: Partial<GenerateDefaultBodyArgs>): GenerateDefaultBodyArgs {
  return {
    card: baseCard,
    intent: null,
    plan: null,
    latestRun: null,
    evidence: [],
    gates: [],
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('generateDefaultBody', () => {
  it('emits a single placeholder paragraph when card has no IntentSpec', () => {
    const doc = generateDefaultBody(args());
    expect(doc.type).toBe('doc');
    expect(doc.content).toHaveLength(1);
    expect(doc.content[0]!.type).toBe('paragraph');
    // Placeholder text — uses lower-cased "type /" hint so the user knows
    // they can launch the slash menu (which lands in 10-02 as a real
    // shortcut). The exact wording is asserted so future copy changes
    // surface here.
    expect(doc.content[0]!.content?.[0]?.text).toContain('Type /');
  });

  it('emits intent + 2 inputs + 3 KPIs in canonical order', () => {
    const intent = makeIntent({
      inputs: [
        makeInput('geometry', 'art_geo'),
        makeInput('material'), // no artifact pinned yet
      ],
      acceptance_criteria: [
        makeCriterion('first_freq_hz', 'between', [10, 30]),
        makeCriterion('max_stress_mpa', 'lt', 250),
        makeCriterion('mass_kg', 'gt', 0.5),
      ],
    });
    const doc = generateDefaultBody(args({ intent }));

    const kinds = doc.content.map((b) => b.type);
    expect(kinds).toEqual([
      'intentBlock',
      'inputBlock',
      'inputBlock',
      'kpiBlock',
      'kpiBlock',
      'kpiBlock',
    ]);

    // Intent attrs
    expect(doc.content[0]!.attrs).toEqual({ intentSpecId: 'int_test' });

    // First input pulls artifact_ref → artifactId; portName uses input name.
    expect(doc.content[1]!.attrs).toEqual({ artifactId: 'art_geo', portName: 'geometry' });
    // Second input has no artifact pinned — artifactId is null.
    expect(doc.content[2]!.attrs).toEqual({ artifactId: null, portName: 'material' });

    // KPI operator collapsing: 'between' stays, 'lt' → 'less_than',
    // 'gt' → 'greater_than'.
    expect(doc.content[3]!.attrs).toMatchObject({
      metricKey: 'first_freq_hz',
      operator: 'between',
      threshold: [10, 30],
    });
    expect(doc.content[4]!.attrs).toMatchObject({
      metricKey: 'max_stress_mpa',
      operator: 'less_than',
      threshold: 250,
    });
    expect(doc.content[5]!.attrs).toMatchObject({
      metricKey: 'mass_kg',
      operator: 'greater_than',
      threshold: 0.5,
    });
  });

  it('intent + plan emits intent + method + run with no inputs/kpis', () => {
    const intent = makeIntent({ inputs: [], acceptance_criteria: [] });
    const plan = makePlan('plan_xyz');
    const doc = generateDefaultBody(args({ intent, plan }));
    expect(doc.content.map((b) => b.type)).toEqual([
      'intentBlock',
      'methodBlock',
      'runBlock',
    ]);
    expect(doc.content[1]!.attrs).toEqual({ planId: 'plan_xyz' });
    expect(doc.content[2]!.attrs).toEqual({});
  });

  it('intent without plan does NOT emit method or run blocks', () => {
    const intent = makeIntent({
      inputs: [makeInput('input_a', 'art_a')],
      acceptance_criteria: [makeCriterion('m', 'eq', 1)],
    });
    const doc = generateDefaultBody(args({ intent, plan: null }));
    const kinds = doc.content.map((b) => b.type);
    expect(kinds).toEqual(['intentBlock', 'inputBlock', 'kpiBlock']);
    expect(kinds).not.toContain('methodBlock');
    expect(kinds).not.toContain('runBlock');
  });

  it('completed run emits result blocks for each evidence row with an artifact', () => {
    const intent = makeIntent({
      inputs: [makeInput('input_a', 'art_a')],
      acceptance_criteria: [makeCriterion('m', 'lt', 1)],
    });
    const plan = makePlan();
    const evidence: CardEvidence[] = [
      makeEvidence({ id: 'cevd_1', artifact_id: 'art_out_1', metric_key: 'm1', metric_value: 1 }),
      makeEvidence({ id: 'cevd_2', artifact_id: 'art_out_2', metric_key: 'm2', metric_value: 2 }),
      // Evidence without an artifact still appears as evidenceBlock but NOT
      // as resultBlock — the UI represents that as a metric reading only.
      makeEvidence({ id: 'cevd_3', metric_key: 'm3', metric_value: 3 }),
    ];
    const doc = generateDefaultBody(
      args({
        intent,
        plan,
        latestRun: { id: 'run_1', status: 'completed' },
        evidence,
      }),
    );

    const kinds = doc.content.map((b) => b.type);
    expect(kinds).toEqual([
      'intentBlock',
      'inputBlock',
      'kpiBlock',
      'methodBlock',
      'runBlock',
      'resultBlock', // cevd_1 with artifact
      'resultBlock', // cevd_2 with artifact
      // cevd_3 — no artifact, skipped here
      'evidenceBlock',
      'evidenceBlock',
      'evidenceBlock',
    ]);
    // Result block artifactId comes from evidence.artifact_id
    expect(doc.content[5]!.attrs).toEqual({ artifactId: 'art_out_1' });
    expect(doc.content[6]!.attrs).toEqual({ artifactId: 'art_out_2' });
  });

  it('running (non-terminal) latestRun does NOT emit result blocks yet', () => {
    const intent = makeIntent({});
    const plan = makePlan();
    const evidence: CardEvidence[] = [
      makeEvidence({ id: 'cevd_1', artifact_id: 'art_out_1' }),
    ];
    const doc = generateDefaultBody(
      args({ intent, plan, latestRun: { id: 'run_1', status: 'running' }, evidence }),
    );
    expect(doc.content.map((b) => b.type)).toEqual([
      'intentBlock',
      'methodBlock',
      'runBlock',
      // no resultBlock — run not in terminal-pass state
      'evidenceBlock',
    ]);
  });

  it('appends gate blocks for each gate required by the board mode', () => {
    const intent = makeIntent({});
    const gates = [makeGate('gate_1'), makeGate('gate_2')];
    const doc = generateDefaultBody(args({ intent, gates }));
    expect(doc.content.map((b) => b.type)).toEqual([
      'intentBlock',
      'gateBlock',
      'gateBlock',
    ]);
    expect(doc.content[1]!.attrs).toEqual({ gateId: 'gate_1' });
    expect(doc.content[2]!.attrs).toEqual({ gateId: 'gate_2' });
  });

  it('coerces non-numeric thresholds to 0 and malformed between to [0,0]', () => {
    const intent = makeIntent({
      acceptance_criteria: [
        // String numeric — parsed.
        makeCriterion('a', 'lt', '42'),
        // Object — falls back to 0.
        makeCriterion('b', 'gt', { not: 'a number' }),
        // Between with bad shape — falls back to [0, 0].
        makeCriterion('c', 'between', 'not an array'),
      ],
    });
    const doc = generateDefaultBody(args({ intent }));
    expect(doc.content[1]!.attrs).toMatchObject({ operator: 'less_than', threshold: 42 });
    expect(doc.content[2]!.attrs).toMatchObject({ operator: 'greater_than', threshold: 0 });
    expect(doc.content[3]!.attrs).toMatchObject({ operator: 'between', threshold: [0, 0] });
  });

  it('eq / neq / in collapse to "eq" for the KPI block', () => {
    const intent = makeIntent({
      acceptance_criteria: [
        makeCriterion('a', 'eq', 1),
        makeCriterion('b', 'neq', 2),
        makeCriterion('c', 'in', ['x', 'y']),
      ],
    });
    const doc = generateDefaultBody(args({ intent }));
    expect(doc.content.slice(1).map((b) => (b.attrs as { operator: string }).operator)).toEqual([
      'eq',
      'eq',
      'eq',
    ]);
  });
});
