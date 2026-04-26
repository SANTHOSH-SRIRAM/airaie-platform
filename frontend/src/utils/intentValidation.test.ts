import { describe, it, expect } from 'vitest';
import {
  validateAcceptanceCriteria,
  validateIntentInputs,
  validateIntentDraft,
  type IntentCriterionDraft,
  type IntentInputDraft,
} from './intentValidation';

function crit(overrides: Partial<IntentCriterionDraft> = {}): IntentCriterionDraft {
  return {
    name: 'max_stress',
    metric: 'von_mises_max',
    operator: 'lte',
    threshold: '235',
    unit: 'MPa',
    ...overrides,
  };
}

describe('validateAcceptanceCriteria', () => {
  it('requires at least one criterion', () => {
    const errors = validateAcceptanceCriteria([]);
    expect(errors).toEqual(['At least one acceptance criterion is required']);
  });

  it('passes with a single valid criterion', () => {
    expect(validateAcceptanceCriteria([crit()])).toEqual([]);
  });

  it('flags missing name, metric, threshold', () => {
    const errors = validateAcceptanceCriteria([
      crit({ name: '', metric: '', threshold: '' }),
    ]);
    expect(errors).toEqual([
      'Criterion 1: name is required',
      'Criterion 1: metric is required',
      'Criterion 1: threshold is required',
    ]);
  });

  it('rejects unsupported operators', () => {
    const errors = validateAcceptanceCriteria([
      crit({ operator: 'approx' as never }),
    ]);
    expect(errors).toContain('Criterion 1: operator "approx" is not supported');
  });

  it('detects duplicate criterion names (case-insensitive)', () => {
    const errors = validateAcceptanceCriteria([
      crit({ name: 'StressLimit' }),
      crit({ name: 'stresslimit', metric: 'other_metric' }),
    ]);
    expect(errors).toContain('Duplicate criterion name: "stresslimit"');
  });
});

describe('validateIntentInputs', () => {
  it('returns no errors for an empty list', () => {
    expect(validateIntentInputs([])).toEqual([]);
  });

  it('flags rows with a key but no value', () => {
    const inputs: IntentInputDraft[] = [{ key: 'cad_geometry', value: '' }];
    expect(validateIntentInputs(inputs)).toEqual([
      'Input 1: value is required for key "cad_geometry"',
    ]);
  });

  it('flags rows with a value but no key', () => {
    const inputs: IntentInputDraft[] = [{ key: '', value: 'art_123' }];
    expect(validateIntentInputs(inputs)).toEqual(['Input 1: key is required']);
  });

  it('detects duplicate keys', () => {
    const inputs: IntentInputDraft[] = [
      { key: 'mesh', value: 'art_a' },
      { key: 'mesh', value: 'art_b' },
    ];
    expect(validateIntentInputs(inputs)).toContain('Duplicate input key: "mesh"');
  });
});

describe('validateIntentDraft', () => {
  const baseDraft = {
    name: 'Stress validation',
    description: '',
    intentType: 'fea_static_linear',
    criteria: [crit()],
    inputs: [],
  };

  it('passes with a minimal valid draft', () => {
    expect(validateIntentDraft(baseDraft)).toEqual([]);
  });

  it('requires a name', () => {
    expect(validateIntentDraft({ ...baseDraft, name: '   ' })).toContain(
      'Intent name is required',
    );
  });

  it('caps the name length at 120 chars', () => {
    expect(
      validateIntentDraft({ ...baseDraft, name: 'a'.repeat(121) }),
    ).toContain('Intent name must be 120 characters or fewer');
  });

  it('requires an intent type', () => {
    expect(
      validateIntentDraft({ ...baseDraft, intentType: '' }),
    ).toContain('Intent type is required');
  });

  it('skips criteria checks when requireCriteria is false and list is empty', () => {
    const errors = validateIntentDraft(
      { ...baseDraft, criteria: [] },
      { requireCriteria: false },
    );
    expect(errors).toEqual([]);
  });

  it('still validates non-empty criteria even in Explore mode', () => {
    const errors = validateIntentDraft(
      {
        ...baseDraft,
        criteria: [crit({ metric: '' })],
      },
      { requireCriteria: false },
    );
    expect(errors).toContain('Criterion 1: metric is required');
  });

  it('drops fully-empty rows before validating', () => {
    const errors = validateIntentDraft({
      ...baseDraft,
      criteria: [crit(), { name: '', metric: '', operator: 'lte', threshold: '' }],
      inputs: [{ key: '', value: '' }],
    });
    expect(errors).toEqual([]);
  });
});
