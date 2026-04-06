import { useState } from 'react';
import { cn } from '@utils/cn';
import { addGateRequirement } from '@api/gates';
import type { ReqType } from '@/types/gate';
import { Plus, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REQ_TYPES: { value: ReqType; label: string }[] = [
  { value: 'run_succeeded', label: 'Run Succeeded' },
  { value: 'artifact_exists', label: 'Artifact Exists' },
  { value: 'role_signed', label: 'Role Signed' },
  { value: 'metric_threshold', label: 'Metric Threshold' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RequirementEditorProps {
  gateId: string;
  onAdded?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RequirementEditor({ gateId, onAdded }: RequirementEditorProps) {
  const [reqType, setReqType] = useState<ReqType>('run_succeeded');
  const [description, setDescription] = useState('');
  const [configJson, setConfigJson] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validate JSON
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(configJson);
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON');
      return;
    }

    if (!description.trim()) return;

    setLoading(true);
    try {
      await addGateRequirement(gateId, {
        req_type: reqType,
        description: description.trim(),
        config,
      });

      // Reset
      setDescription('');
      setConfigJson('{}');
      onAdded?.();
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = description.trim() && !loading;

  return (
    <div className="flex flex-col gap-[10px]">
      <span className="text-[11px] font-semibold text-[#1a1a1a]">Add Requirement</span>

      {/* Type dropdown */}
      <div>
        <label className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[4px]">
          Requirement Type
        </label>
        <select
          value={reqType}
          onChange={(e) => setReqType(e.target.value as ReqType)}
          className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] bg-white focus:outline-none focus:border-[#ff9800] transition-colors"
        >
          {REQ_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[4px]">
          Description <span className="text-[#e74c3c]">*</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the requirement..."
          className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
        />
      </div>

      {/* Config JSON */}
      <div>
        <label className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[4px]">
          Config (JSON)
        </label>
        <textarea
          value={configJson}
          onChange={(e) => {
            setConfigJson(e.target.value);
            setJsonError(null);
          }}
          rows={3}
          className={cn(
            'w-full px-[10px] py-[8px] rounded-[6px] border text-[12px] font-mono text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none transition-colors resize-none',
            jsonError ? 'border-[#e74c3c] focus:border-[#e74c3c]' : 'border-[#e8e8e8] focus:border-[#ff9800]',
          )}
        />
        {jsonError && (
          <span className="text-[10px] text-[#e74c3c] mt-[2px]">{jsonError}</span>
        )}
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
          {loading && <Loader2 size={12} className="animate-spin" />}
          <Plus size={12} />
          Add Requirement
        </button>
      </div>
    </div>
  );
}
