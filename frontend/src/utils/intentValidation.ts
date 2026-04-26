import type { CriterionOperator } from '@/types/intent';

/**
 * Form-shaped acceptance criterion used by CreateBoardPage and other
 * IntentSpec capture forms. Distinct from `AcceptanceCriterion` (the
 * locked, server-side shape) because the UI keeps `threshold` as the
 * raw user-typed string until submit time.
 */
export interface IntentCriterionDraft {
  id?: string;
  name: string; // UI label — also feeds the criterion `id` if `id` is unset
  metric: string;
  operator: CriterionOperator;
  threshold: string;
  unit?: string;
}

/**
 * Form-shaped IntentSpec input row. `key` corresponds to the input
 * `name` (port name). `value` is interpreted as either an artifact
 * reference (when it begins with `art_` or contains `://`) or a raw
 * parameter value.
 */
export interface IntentInputDraft {
  key: string;
  value: string;
}

export interface IntentDraft {
  name: string;
  description: string;
  intentType: string;
  criteria: IntentCriterionDraft[];
  inputs: IntentInputDraft[];
}

export const VALID_OPERATORS: CriterionOperator[] = [
  'lt',
  'lte',
  'gt',
  'gte',
  'eq',
  'neq',
  'in',
  'between',
];

/**
 * Validate the acceptance criteria section of an IntentSpec draft.
 *
 * Returns a list of human-readable error messages. An empty array
 * means the criteria are valid for submission.
 *
 * Rules:
 *  - At least one criterion is required (caller may relax this for
 *    Explore-mode boards by skipping the call).
 *  - Each criterion needs a non-empty `name` and `metric`.
 *  - Operator must be one of the kernel-recognised operators.
 *  - Threshold must be non-empty.
 *  - Criterion `name` values must be unique within the list.
 */
export function validateAcceptanceCriteria(
  criteria: IntentCriterionDraft[],
): string[] {
  const errors: string[] = [];

  if (!criteria || criteria.length === 0) {
    errors.push('At least one acceptance criterion is required');
    return errors;
  }

  const seenNames = new Map<string, number>();

  criteria.forEach((c, i) => {
    const label = `Criterion ${i + 1}`;
    if (!c.name || !c.name.trim()) {
      errors.push(`${label}: name is required`);
    } else {
      const norm = c.name.trim().toLowerCase();
      seenNames.set(norm, (seenNames.get(norm) ?? 0) + 1);
    }
    if (!c.metric || !c.metric.trim()) {
      errors.push(`${label}: metric is required`);
    }
    if (!VALID_OPERATORS.includes(c.operator)) {
      errors.push(`${label}: operator "${c.operator}" is not supported`);
    }
    if (c.threshold === undefined || c.threshold === null || `${c.threshold}`.trim() === '') {
      errors.push(`${label}: threshold is required`);
    }
  });

  for (const [name, count] of seenNames.entries()) {
    if (count > 1) {
      errors.push(`Duplicate criterion name: "${name}"`);
    }
  }

  return errors;
}

/**
 * Validate the inputs map. Each row needs both a key and a value.
 * Empty rows are silently dropped before validation runs in the
 * caller, but if a partially-filled row is passed in we surface it.
 */
export function validateIntentInputs(inputs: IntentInputDraft[]): string[] {
  const errors: string[] = [];
  const seenKeys = new Map<string, number>();

  inputs.forEach((row, i) => {
    const label = `Input ${i + 1}`;
    const hasKey = row.key && row.key.trim().length > 0;
    const hasValue = row.value && row.value.trim().length > 0;
    if (hasKey && !hasValue) {
      errors.push(`${label}: value is required for key "${row.key}"`);
    } else if (!hasKey && hasValue) {
      errors.push(`${label}: key is required`);
    } else if (hasKey) {
      const norm = row.key.trim();
      seenKeys.set(norm, (seenKeys.get(norm) ?? 0) + 1);
    }
  });

  for (const [key, count] of seenKeys.entries()) {
    if (count > 1) {
      errors.push(`Duplicate input key: "${key}"`);
    }
  }

  return errors;
}

/**
 * Validate an IntentSpec draft as a whole.
 *
 * `requireCriteria` is `true` for Study/Release boards and `false`
 * for Explore-mode boards (where acceptance criteria are advisory).
 */
export function validateIntentDraft(
  draft: IntentDraft,
  options: { requireCriteria?: boolean } = {},
): string[] {
  const errors: string[] = [];
  const requireCriteria = options.requireCriteria ?? true;

  const name = (draft.name ?? '').trim();
  if (!name) {
    errors.push('Intent name is required');
  } else if (name.length > 120) {
    errors.push('Intent name must be 120 characters or fewer');
  }

  if (!draft.intentType || !draft.intentType.trim()) {
    errors.push('Intent type is required');
  }

  // Drop fully-empty rows before validating criteria/inputs.
  const criteria = (draft.criteria ?? []).filter(
    (c) => c.name?.trim() || c.metric?.trim() || `${c.threshold ?? ''}`.trim(),
  );
  if (requireCriteria || criteria.length > 0) {
    errors.push(...validateAcceptanceCriteria(criteria));
  }

  const inputs = (draft.inputs ?? []).filter(
    (r) => r.key?.trim() || r.value?.trim(),
  );
  errors.push(...validateIntentInputs(inputs));

  return errors;
}
