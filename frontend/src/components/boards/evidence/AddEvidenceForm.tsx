import { useState } from 'react';
import { cn } from '@utils/cn';
import { useAddEvidence } from '@hooks/useCards';
import { Loader2, Plus } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddEvidenceFormProps {
  cardId: string;
  onAdded?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AddEvidenceForm({ cardId, onAdded }: AddEvidenceFormProps) {
  const addEvidence = useAddEvidence(cardId);

  const [metricKey, setMetricKey] = useState('');
  const [metricValue, setMetricValue] = useState<number | ''>('');
  const [metricUnit, setMetricUnit] = useState('');
  const [artifactId, setArtifactId] = useState('');

  const canSubmit = metricKey.trim() && metricValue !== '' && !addEvidence.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    await addEvidence.mutateAsync({
      metric_key: metricKey.trim(),
      metric_value: Number(metricValue),
      metric_unit: metricUnit.trim() || undefined,
      artifact_id: artifactId.trim() || undefined,
      evaluation: 'info', // default; backend should re-evaluate
    });

    // Reset
    setMetricKey('');
    setMetricValue('');
    setMetricUnit('');
    setArtifactId('');
    onAdded?.();
  };

  return (
    <div className="flex flex-col gap-[10px]">
      <span className="text-[11px] font-semibold text-[#1a1a1a]">Add Evidence Manually</span>

      <div className="grid grid-cols-[1fr_100px_80px_1fr] gap-[8px] items-end">
        {/* Metric key */}
        <div>
          <label className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[4px]">
            Metric Key <span className="text-[#e74c3c]">*</span>
          </label>
          <input
            type="text"
            value={metricKey}
            onChange={(e) => setMetricKey(e.target.value)}
            placeholder="e.g. max_stress"
            className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] font-mono text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
          />
        </div>

        {/* Value */}
        <div>
          <label className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[4px]">
            Value <span className="text-[#e74c3c]">*</span>
          </label>
          <input
            type="number"
            value={metricValue}
            onChange={(e) => setMetricValue(e.target.value ? Number(e.target.value) : '')}
            placeholder="0"
            className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
          />
        </div>

        {/* Unit */}
        <div>
          <label className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[4px]">
            Unit
          </label>
          <input
            type="text"
            value={metricUnit}
            onChange={(e) => setMetricUnit(e.target.value)}
            placeholder="MPa"
            className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
          />
        </div>

        {/* Artifact ID */}
        <div>
          <label className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[4px]">
            Artifact ID
          </label>
          <input
            type="text"
            value={artifactId}
            onChange={(e) => setArtifactId(e.target.value)}
            placeholder="Optional artifact reference"
            className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] font-mono text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            'h-[32px] px-[16px] rounded-[8px] text-[11px] font-semibold text-white transition-colors flex items-center gap-[5px]',
            canSubmit
              ? 'bg-[#ff9800] hover:bg-[#f57c00]'
              : 'bg-[#d0d0d0] cursor-not-allowed',
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
