import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useUpdateIntent } from '@hooks/useIntents';
import ConfigSection from './ConfigSection';
import type { IntentSpec, AcceptanceCriterion, CriterionOperator } from '@/types/intent';
import type { CardModeRules } from '@hooks/useCardModeRules';

// ---------------------------------------------------------------------------
// AddCustomKpiForm — inline form to append a new acceptance_criterion row to
// the IntentSpec. Operators map 1:1 to the kernel's CriterionOperator enum
// (lt/lte/gt/gte/eq/neq/in/between). For the user-facing labels we collapse
// to a short menu (less_than / greater_than / equals / between) and translate
// to the canonical enum on submit.
//
// Validation:
//   - key must be non-empty after trim
//   - threshold must parse as a number (or two numbers comma-separated for `between`)
//   - operator must be one of the supported aliases
//
// On success we invalidate the IntentSpec cache so CardHero's KPI list
// reflects the new row immediately.
// ---------------------------------------------------------------------------

interface AddCustomKpiFormProps {
  intent: IntentSpec;
  rules: CardModeRules;
  /**
   * Optional board id for cache invalidation when the IntentSpec list cache
   * needs to be refreshed (passed through to useUpdateIntent).
   */
  boardId?: string;
}

type OpAlias = 'less_than' | 'greater_than' | 'equals' | 'between';

const OP_TO_ENUM: Record<OpAlias, CriterionOperator> = {
  less_than: 'lt',
  greater_than: 'gt',
  equals: 'eq',
  between: 'between',
};

const OP_LABELS: Record<OpAlias, string> = {
  less_than: '<',
  greater_than: '>',
  equals: '=',
  between: 'between',
};

function parseThreshold(
  raw: string,
  op: OpAlias,
): { ok: true; value: number | [number, number] } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: 'Threshold is required' };

  if (op === 'between') {
    const parts = trimmed.split(',').map((p) => p.trim());
    if (parts.length !== 2) {
      return { ok: false, error: 'Between requires two values: "min, max"' };
    }
    const lo = Number(parts[0]);
    const hi = Number(parts[1]);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      return { ok: false, error: 'Both values must be numeric' };
    }
    if (lo >= hi) {
      return { ok: false, error: 'Min must be less than max' };
    }
    return { ok: true, value: [lo, hi] };
  }

  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return { ok: false, error: 'Threshold must be a number' };
  }
  return { ok: true, value: n };
}

export default function AddCustomKpiForm({ intent, rules, boardId }: AddCustomKpiFormProps) {
  const updateIntent = useUpdateIntent(intent.id, boardId ?? intent.board_id);
  const [key, setKey] = useState('');
  const [op, setOp] = useState<OpAlias>('less_than');
  const [threshold, setThreshold] = useState('');
  const [unit, setUnit] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setKey('');
    setOp('less_than');
    setThreshold('');
    setUnit('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setError('KPI key is required');
      return;
    }

    const parsed = parseThreshold(threshold, op);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    const next: AcceptanceCriterion = {
      // The kernel assigns an id on persist; pass an empty string for now and
      // it'll be overwritten on the round-trip.
      id: '',
      metric: trimmedKey,
      operator: OP_TO_ENUM[op],
      threshold: parsed.value,
      unit: unit.trim() || undefined,
    };

    try {
      await updateIntent.mutateAsync({
        acceptance_criteria: [...(intent.acceptance_criteria ?? []), next],
      });
      reset();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to add KPI';
      setError(msg);
    }
  };

  return (
    <ConfigSection
      title="Add Custom KPI"
      disabled={!rules.canEditIntentGoalAndKpis}
      disabledReason={
        rules.mode === 'release'
          ? 'KPIs are locked in Release mode'
          : 'KPIs are locked once the first run starts in Study mode'
      }
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-[8px]"
        aria-label="Add custom KPI"
      >
        <div className="flex flex-col gap-[4px]">
          <label htmlFor="kpi-key" className="text-[10px] font-medium text-[#6b6b6b] uppercase tracking-[0.5px]">
            KPI key
          </label>
          <input
            id="kpi-key"
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={!rules.canEditIntentGoalAndKpis || updateIntent.isPending}
            placeholder="e.g. lift_coefficient"
            className="h-[32px] px-[10px] rounded-[6px] border border-[#e0e0e0] bg-white text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:border-[#f57c00] focus:outline-none disabled:bg-[#fafafa] disabled:cursor-not-allowed w-[180px]"
          />
        </div>

        <div className="flex flex-col gap-[4px]">
          <label htmlFor="kpi-op" className="text-[10px] font-medium text-[#6b6b6b] uppercase tracking-[0.5px]">
            Operator
          </label>
          <select
            id="kpi-op"
            value={op}
            onChange={(e) => setOp(e.target.value as OpAlias)}
            disabled={!rules.canEditIntentGoalAndKpis || updateIntent.isPending}
            aria-label="Operator"
            className="h-[32px] px-[8px] rounded-[6px] border border-[#e0e0e0] bg-white text-[12px] text-[#1a1a1a] focus:border-[#f57c00] focus:outline-none disabled:bg-[#fafafa] disabled:cursor-not-allowed"
          >
            {(Object.keys(OP_LABELS) as OpAlias[]).map((k) => (
              <option key={k} value={k}>
                {OP_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-[4px]">
          <label htmlFor="kpi-threshold" className="text-[10px] font-medium text-[#6b6b6b] uppercase tracking-[0.5px]">
            Threshold
          </label>
          <input
            id="kpi-threshold"
            type="text"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            disabled={!rules.canEditIntentGoalAndKpis || updateIntent.isPending}
            placeholder={op === 'between' ? '1.2, 1.4' : '0.05'}
            className="h-[32px] px-[10px] rounded-[6px] border border-[#e0e0e0] bg-white text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:border-[#f57c00] focus:outline-none disabled:bg-[#fafafa] disabled:cursor-not-allowed w-[140px]"
          />
        </div>

        <div className="flex flex-col gap-[4px]">
          <label htmlFor="kpi-unit" className="text-[10px] font-medium text-[#6b6b6b] uppercase tracking-[0.5px]">
            Unit (optional)
          </label>
          <input
            id="kpi-unit"
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={!rules.canEditIntentGoalAndKpis || updateIntent.isPending}
            placeholder="e.g. MPa"
            className="h-[32px] px-[10px] rounded-[6px] border border-[#e0e0e0] bg-white text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:border-[#f57c00] focus:outline-none disabled:bg-[#fafafa] disabled:cursor-not-allowed w-[100px]"
          />
        </div>

        <button
          type="submit"
          disabled={!rules.canEditIntentGoalAndKpis || updateIntent.isPending}
          aria-label="Add KPI"
          className="inline-flex items-center gap-[6px] h-[32px] px-[12px] rounded-[6px] bg-[#1a1a1a] text-white text-[12px] font-medium hover:bg-[#2d2d2d] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={12} />
          {updateIntent.isPending ? 'Adding…' : 'Add KPI'}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-[8px] text-[11px] text-[#e74c3c]"
        >
          {error}
        </p>
      )}
    </ConfigSection>
  );
}
