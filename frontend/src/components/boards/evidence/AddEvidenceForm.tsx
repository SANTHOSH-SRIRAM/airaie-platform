import { useState } from 'react';
import { cn } from '@utils/cn';
import { useAddCardEvidence } from '@hooks/useGates';
import { Loader2, Plus } from 'lucide-react';

// ---------------------------------------------------------------------------
// AddEvidenceForm (D4) — manual evidence add for the card-scoped panel.
//
// Uses the unified `useAddCardEvidence` hook so both the legacy
// `cardKeys.evidence` cache and the new `gateKeys.cardEvidenceUnified` cache
// are invalidated on submit (and any aggregating gate views).
// ---------------------------------------------------------------------------

interface AddEvidenceFormProps {
  cardId: string;
  onAdded?: () => void;
}

export default function AddEvidenceForm({ cardId, onAdded }: AddEvidenceFormProps) {
  const addEvidence = useAddCardEvidence(cardId);

  const [metricName, setMetricName] = useState('');
  const [metricValue, setMetricValue] = useState<number | ''>('');
  const [unit, setUnit] = useState('');
  const [rationale, setRationale] = useState('');
  const [sourceRunId, setSourceRunId] = useState('');

  const canSubmit =
    metricName.trim() !== '' && metricValue !== '' && !addEvidence.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await addEvidence.mutateAsync({
      metric_name: metricName.trim(),
      metric_value: Number(metricValue),
      unit: unit.trim() || undefined,
      rationale: rationale.trim() || undefined,
      source_run_id: sourceRunId.trim() || undefined,
    });
    setMetricName('');
    setMetricValue('');
    setUnit('');
    setRationale('');
    setSourceRunId('');
    onAdded?.();
  };

  return (
    <div className="flex flex-col gap-[10px]">
      <span className="text-[11px] font-semibold text-[#1a1a1a]">Add Evidence Manually</span>

      <div className="grid grid-cols-[1fr_100px_80px_1fr] gap-[8px] items-end">
        <Field label="Metric Name" required>
          <input
            type="text"
            value={metricName}
            onChange={(e) => setMetricName(e.target.value)}
            placeholder="e.g. max_stress"
            className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] font-mono text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
          />
        </Field>

        <Field label="Value" required>
          <input
            type="number"
            value={metricValue}
            onChange={(e) => setMetricValue(e.target.value ? Number(e.target.value) : '')}
            placeholder="0"
            className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
          />
        </Field>

        <Field label="Unit">
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="MPa"
            className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
          />
        </Field>

        <Field label="Source Run ID">
          <input
            type="text"
            value={sourceRunId}
            onChange={(e) => setSourceRunId(e.target.value)}
            placeholder="run_xxx (optional)"
            className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] font-mono text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
          />
        </Field>
      </div>

      <Field label="Rationale">
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why is this evidence being added manually?"
          rows={2}
          className="w-full px-[10px] py-[8px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors resize-none"
        />
      </Field>

      {addEvidence.error && (
        <span className="text-[11px] text-[#e74c3c]">
          Failed to add evidence: {(addEvidence.error as Error).message}
        </span>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            'h-[32px] px-[16px] rounded-[8px] text-[11px] font-semibold text-white transition-colors flex items-center gap-[5px]',
            canSubmit ? 'bg-[#ff9800] hover:bg-[#f57c00]' : 'bg-[#d0d0d0] cursor-not-allowed',
          )}
        >
          {addEvidence.isPending && <Loader2 size={12} className="animate-spin" />}
          <Plus size={12} />
          Add Evidence
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[4px]">
        {label} {required && <span className="text-[#e74c3c]">*</span>}
      </label>
      {children}
    </div>
  );
}
