import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from '@utils/cn';
import type { CriterionOperator, IntentTypeDefinition } from '@/types/intent';
import type {
  IntentCriterionDraft,
  IntentInputDraft,
  IntentDraft,
} from '@utils/intentValidation';

// ---------------------------------------------------------------------------
// Operator options for the IntentSpec acceptance-criteria builder.
// ---------------------------------------------------------------------------

export const OPERATOR_OPTIONS: { value: CriterionOperator; label: string }[] = [
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'in', label: 'in' },
  { value: 'between', label: 'between' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IntentSpecFormProps {
  /** The current draft state. */
  value: IntentDraft;
  /** Patch handler — receives the next draft. */
  onChange: (next: IntentDraft) => void;
  /** Available intent types to show in the dropdown. */
  intentTypes: IntentTypeDefinition[];
  /** Whether the intent-types list is loading. */
  intentTypesLoading?: boolean;
  /** Whether `criteria` is required (Study/Release vs Explore mode). */
  requireCriteria?: boolean;
  /** Validation errors to display under the form. */
  errors?: string[];
  /** Disable the entire form (e.g. while submitting). */
  disabled?: boolean;
  /** When true, render the dropdown trigger but disallow opening. */
  intentTypeDropdownOpen?: boolean;
  onIntentTypeDropdownToggle?: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RequiredStar() {
  return (
    <span className="font-semibold text-[11px] text-[#e74c3c] ml-[2px]">*</span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Presentational IntentSpec form. Owns no API calls; the parent supplies
 * the intent-type list and receives the draft via `onChange`. Used by
 * both `CreateBoardPage` (inline) and `IntentSpecModal` (overlay).
 */
export default function IntentSpecForm({
  value,
  onChange,
  intentTypes,
  intentTypesLoading = false,
  requireCriteria = true,
  errors = [],
  disabled = false,
  intentTypeDropdownOpen,
  onIntentTypeDropdownToggle,
}: IntentSpecFormProps) {
  // Use either controlled or local state for the dropdown. We keep this
  // out of the draft so callers don't have to track UI-only flags.
  const dropdownControlled = typeof intentTypeDropdownOpen === 'boolean';
  const isDropdownOpen = dropdownControlled ? intentTypeDropdownOpen : false;
  const toggleDropdown = (next: boolean) => {
    if (dropdownControlled) {
      onIntentTypeDropdownToggle?.(next);
    } else {
      // Fallback: use a key to force a re-render of the open state via
      // local React state. Since the property is optional, we expect
      // most callers to manage their own state.
      onIntentTypeDropdownToggle?.(next);
    }
  };

  // ── Update helpers ────────────────────────────
  const update = (patch: Partial<IntentDraft>) => onChange({ ...value, ...patch });

  const updateCriterion = (idx: number, patch: Partial<IntentCriterionDraft>) =>
    update({
      criteria: value.criteria.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    });

  const addCriterion = () =>
    update({
      criteria: [
        ...value.criteria,
        { name: '', metric: '', operator: 'lte', threshold: '', unit: '' },
      ],
    });

  const removeCriterion = (idx: number) =>
    update({ criteria: value.criteria.filter((_, i) => i !== idx) });

  const updateInputRow = (idx: number, patch: Partial<IntentInputDraft>) =>
    update({
      inputs: value.inputs.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });

  const addInputRow = () =>
    update({ inputs: [...value.inputs, { key: '', value: '' }] });

  const removeInputRow = (idx: number) =>
    update({ inputs: value.inputs.filter((_, i) => i !== idx) });

  const selectedType = intentTypes.find((t) => t.slug === value.intentType);

  return (
    <div className={cn('flex flex-col gap-[14px]', disabled && 'opacity-60 pointer-events-none')}>
      {/* Intent Name */}
      <div>
        <span className="text-[11px] font-medium text-[#6b6b6b]">
          Name<RequiredStar />
        </span>
        <div className="bg-[#f5f5f0] rounded-[8px] h-[40px] flex items-center px-[14px] mt-[4px]">
          <input
            type="text"
            value={value.name}
            maxLength={120}
            disabled={disabled}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Validate beam stress under 235 MPa"
            className="w-full bg-transparent text-[12px] font-medium text-[#1a1a1a] focus:outline-none placeholder:text-[#acacac]"
          />
        </div>
      </div>

      {/* Intent Description */}
      <div>
        <span className="text-[11px] font-medium text-[#6b6b6b]">Description</span>
        <div className="bg-[#f5f5f0] rounded-[8px] px-[14px] py-[10px] mt-[4px]">
          <textarea
            value={value.description}
            disabled={disabled}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="What should the system accomplish?"
            rows={2}
            className="w-full bg-transparent text-[12px] text-[#1a1a1a] focus:outline-none placeholder:text-[#acacac] resize-none"
          />
        </div>
      </div>

      {/* Intent Type */}
      <div>
        <span className="text-[11px] font-medium text-[#6b6b6b]">
          Intent Type<RequiredStar />
        </span>
        <div className="relative mt-[4px]">
          <button
            type="button"
            disabled={disabled}
            onClick={() => toggleDropdown(!isDropdownOpen)}
            className="w-full bg-[#f5f5f0] rounded-[8px] h-[40px] flex items-center justify-between px-[14px]"
          >
            <span
              className={cn(
                'text-[12px] font-mono',
                value.intentType ? 'text-[#1a1a1a]' : 'text-[#acacac]',
              )}
            >
              {intentTypesLoading
                ? 'Loading…'
                : value.intentType
                  ? (selectedType?.name ?? value.intentType)
                  : 'Select intent type…'}
            </span>
            <ChevronDown size={12} className="text-[#acacac]" />
          </button>
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => toggleDropdown(false)}
              />
              <div className="absolute top-full mt-[2px] left-0 right-0 bg-white rounded-[8px] shadow-[0px_3px_16px_rgba(0,0,0,0.10)] border border-[#e8e8e8] z-50 py-[4px] max-h-[240px] overflow-y-auto">
                {intentTypesLoading ? (
                  <div className="px-[14px] py-[10px] text-[11px] text-[#acacac]">
                    Loading…
                  </div>
                ) : intentTypes.length === 0 ? (
                  <div className="px-[14px] py-[10px] text-[11px] text-[#acacac]">
                    No intent types available for this vertical.
                  </div>
                ) : (
                  intentTypes.map((t) => (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => {
                        update({ intentType: t.slug });
                        toggleDropdown(false);
                      }}
                      className={cn(
                        'w-full text-left px-[14px] py-[8px] text-[12px] hover:bg-[#f5f5f0] transition-colors',
                        t.slug === value.intentType
                          ? 'text-[#1a1a1a] font-medium'
                          : 'text-[#6b6b6b]',
                      )}
                    >
                      <div className="font-medium">{t.name}</div>
                      <div className="text-[10px] text-[#acacac] font-mono">{t.slug}</div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Acceptance Criteria */}
      <div>
        <div className="flex items-center justify-between mb-[6px]">
          <span className="text-[11px] font-medium text-[#6b6b6b]">
            Acceptance Criteria
            {requireCriteria && <RequiredStar />}
          </span>
          <span className="text-[10px] text-[#acacac]">
            {requireCriteria ? 'At least one required' : 'Optional in Explore mode'}
          </span>
        </div>
        <div className="flex flex-col gap-[6px]">
          {value.criteria.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-[6px] bg-white border border-[#e8e8e8] rounded-[8px] px-[10px] h-[40px]"
            >
              <input
                type="text"
                value={c.name}
                disabled={disabled}
                onChange={(e) => updateCriterion(i, { name: e.target.value })}
                placeholder="Name"
                className="w-[140px] bg-transparent text-[11px] text-[#1a1a1a] focus:outline-none placeholder:text-[#acacac]"
              />
              <input
                type="text"
                value={c.metric}
                disabled={disabled}
                onChange={(e) => updateCriterion(i, { metric: e.target.value })}
                placeholder="metric"
                className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-[#1a1a1a] focus:outline-none placeholder:text-[#acacac]"
              />
              <select
                value={c.operator}
                disabled={disabled}
                onChange={(e) =>
                  updateCriterion(i, { operator: e.target.value as CriterionOperator })
                }
                className="bg-[#f5f5f0] rounded-[6px] px-[8px] h-[26px] text-[11px] text-[#6b6b6b] focus:outline-none"
              >
                {OPERATOR_OPTIONS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={c.threshold}
                disabled={disabled}
                onChange={(e) => updateCriterion(i, { threshold: e.target.value })}
                placeholder="threshold"
                className="w-[80px] bg-[#f5f5f0] rounded-[6px] px-[8px] h-[26px] text-[11px] font-mono text-[#1a1a1a] focus:outline-none placeholder:text-[#acacac]"
              />
              <input
                type="text"
                value={c.unit ?? ''}
                disabled={disabled}
                onChange={(e) => updateCriterion(i, { unit: e.target.value })}
                placeholder="unit"
                className="w-[60px] bg-[#f5f5f0] rounded-[6px] px-[8px] h-[26px] text-[11px] text-[#6b6b6b] focus:outline-none placeholder:text-[#acacac]"
              />
              <button
                type="button"
                onClick={() => removeCriterion(i)}
                disabled={disabled}
                className="text-[#acacac] hover:text-[#e74c3c] transition-colors p-[4px]"
                aria-label="Remove criterion"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addCriterion}
          disabled={disabled}
          className="flex items-center gap-[4px] mt-[6px] text-[11px] text-[#9c27b0] font-medium hover:text-[#7b1fa2] transition-colors"
        >
          <Plus size={12} />
          Add Criterion
        </button>
      </div>

      {/* Inputs */}
      <div>
        <div className="flex items-center justify-between mb-[6px]">
          <span className="text-[11px] font-medium text-[#6b6b6b]">Inputs</span>
          <span className="text-[10px] text-[#acacac]">
            Map port → artifact id (art_xxx) or value
          </span>
        </div>
        {value.inputs.length === 0 ? (
          <p className="text-[11px] text-[#acacac] italic">No inputs declared yet.</p>
        ) : (
          <div className="flex flex-col gap-[6px]">
            {value.inputs.map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-[6px] bg-white border border-[#e8e8e8] rounded-[8px] px-[10px] h-[40px]"
              >
                <input
                  type="text"
                  value={row.key}
                  disabled={disabled}
                  onChange={(e) => updateInputRow(i, { key: e.target.value })}
                  placeholder="port_name"
                  className="w-[160px] bg-transparent text-[11px] font-mono text-[#1a1a1a] focus:outline-none placeholder:text-[#acacac]"
                />
                <span className="text-[#acacac] text-[11px]">→</span>
                <input
                  type="text"
                  value={row.value}
                  disabled={disabled}
                  onChange={(e) => updateInputRow(i, { value: e.target.value })}
                  placeholder="art_xxx or value"
                  className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-[#1a1a1a] focus:outline-none placeholder:text-[#acacac]"
                />
                <button
                  type="button"
                  onClick={() => removeInputRow(i)}
                  disabled={disabled}
                  className="text-[#acacac] hover:text-[#e74c3c] transition-colors p-[4px]"
                  aria-label="Remove input"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addInputRow}
          disabled={disabled}
          className="flex items-center gap-[4px] mt-[6px] text-[11px] text-[#9c27b0] font-medium hover:text-[#7b1fa2] transition-colors"
        >
          <Plus size={12} />
          Add Input
        </button>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="rounded-[6px] bg-[#fdecea] border border-[#f5c2c0] px-[12px] py-[8px]">
          <ul className="list-disc list-inside text-[11px] text-[#c0392b] flex flex-col gap-[2px]">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers — shared by callers that POST IntentSpecs to the kernel.
// ---------------------------------------------------------------------------

/**
 * Convert form-shaped criteria/inputs into the payload expected by
 * POST /v0/boards/{id}/intents.
 *
 * - Filters out blank rows (any row where all fields are empty).
 * - Coerces numeric thresholds to numbers; otherwise keeps the string.
 * - Treats input values that begin with `art_` or contain `://` as
 *   artifact references, otherwise as raw parameter values.
 */
export function buildIntentSpecPayload(draft: IntentDraft): {
  intent_type: string;
  goal: string;
  inputs: Array<{
    name: string;
    type: string;
    required: boolean;
    artifact_ref?: string;
    value?: string;
  }>;
  acceptance_criteria: Array<{
    id: string;
    metric: string;
    operator: CriterionOperator;
    threshold: number | string;
    unit?: string;
    description: string;
  }>;
} {
  const goalText = draft.description.trim() || draft.name.trim();

  const cleanCriteria = draft.criteria
    .filter(
      (c) =>
        (c.name && c.name.trim()) ||
        (c.metric && c.metric.trim()) ||
        `${c.threshold ?? ''}`.trim(),
    )
    .map((c, i) => {
      const raw = `${c.threshold ?? ''}`.trim();
      const num = Number(raw);
      const threshold: number | string =
        raw !== '' && !Number.isNaN(num) ? num : raw;
      const out: {
        id: string;
        metric: string;
        operator: CriterionOperator;
        threshold: number | string;
        unit?: string;
        description: string;
      } = {
        id: c.id || `ac_${i}`,
        metric: c.metric.trim(),
        operator: c.operator,
        threshold,
        description: c.name.trim(),
      };
      if (c.unit && c.unit.trim()) out.unit = c.unit.trim();
      return out;
    });

  const cleanInputs = draft.inputs
    .filter((row) => row.key.trim() && row.value.trim())
    .map((row) => {
      const v = row.value.trim();
      const isArtifactRef = v.startsWith('art_') || v.includes('://');
      return isArtifactRef
        ? {
            name: row.key.trim(),
            type: 'artifact',
            required: true,
            artifact_ref: v,
          }
        : {
            name: row.key.trim(),
            type: 'parameter',
            required: true,
            value: v,
          };
    });

  return {
    intent_type: draft.intentType,
    goal: goalText,
    inputs: cleanInputs,
    acceptance_criteria: cleanCriteria,
  };
}
