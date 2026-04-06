import { useState, useEffect } from 'react';
import { cn } from '@utils/cn';
import { useIntent, useCreateIntent, useLockIntent } from '@hooks/useIntents';
import type { IntentInput, AcceptanceCriterion, CriterionOperator } from '@/types/intent';
import { Plus, Trash2, Lock, Save, Loader2, AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Operator options
// ---------------------------------------------------------------------------

const OPERATORS: { value: CriterionOperator; label: string }[] = [
  { value: 'lt', label: '< (less than)' },
  { value: 'lte', label: '<= (less or equal)' },
  { value: 'gt', label: '> (greater than)' },
  { value: 'gte', label: '>= (greater or equal)' },
  { value: 'eq', label: '= (equal)' },
];

const INPUT_TYPES = ['string', 'number', 'file', 'json'];

const GOVERNANCE_LEVELS = ['none', 'light', 'full'] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IntentSpecEditorProps {
  boardId: string;
  intentId?: string;
  onSave?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IntentSpecEditor({ boardId, intentId, onSave }: IntentSpecEditorProps) {
  const { data: existing, isLoading: loadingExisting } = useIntent(intentId);
  const createIntent = useCreateIntent(boardId);
  const lockIntent = useLockIntent(intentId ?? '', boardId);

  const [goal, setGoal] = useState('');
  const [intentType, setIntentType] = useState('');
  const [inputs, setInputs] = useState<IntentInput[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [govLevel, setGovLevel] = useState<'none' | 'light' | 'full'>('none');
  const [approvalRoles, setApprovalRoles] = useState('');
  const [showLockConfirm, setShowLockConfirm] = useState(false);

  const isLocked = existing?.status === 'locked';

  // Load existing intent data
  useEffect(() => {
    if (existing) {
      setGoal(existing.goal);
      setIntentType(existing.intent_type);
      setInputs(existing.inputs ?? []);
      setCriteria(existing.acceptance_criteria ?? []);
      setGovLevel(existing.governance?.level ?? 'none');
      setApprovalRoles(existing.governance?.approval_roles?.join(', ') ?? '');
    }
  }, [existing]);

  // --- Input management ---
  const addInput = () => {
    setInputs((prev) => [...prev, { name: '', type: 'string', required: false }]);
  };
  const removeInput = (idx: number) => setInputs((prev) => prev.filter((_, i) => i !== idx));
  const updateInput = (idx: number, field: string, value: unknown) => {
    setInputs((prev) => prev.map((inp, i) => (i === idx ? { ...inp, [field]: value } : inp)));
  };

  // --- Criteria management ---
  const addCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      { id: `ac_${Date.now()}`, metric: '', operator: 'lte' as CriterionOperator, threshold: 0, unit: '' },
    ]);
  };
  const removeCriterion = (idx: number) => setCriteria((prev) => prev.filter((_, i) => i !== idx));
  const updateCriterion = (idx: number, field: string, value: unknown) => {
    setCriteria((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  // --- Save ---
  const handleSave = async () => {
    if (!goal.trim()) return;

    await createIntent.mutateAsync({
      intent_type: intentType.trim(),
      goal: goal.trim(),
      inputs: inputs.filter((inp) => inp.name.trim()),
      acceptance_criteria: criteria.filter((c) => c.metric.trim()),
      governance: {
        level: govLevel,
        approval_roles: approvalRoles
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
      },
    });

    onSave?.();
  };

  // --- Lock ---
  const handleLock = async () => {
    if (!intentId) return;
    await lockIntent.mutateAsync();
    setShowLockConfirm(false);
    onSave?.();
  };

  if (loadingExisting && intentId) {
    return (
      <div className="flex items-center justify-center py-[40px]">
        <Loader2 size={20} className="animate-spin text-[#acacac]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[16px]">
      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-center gap-[8px] p-[12px] rounded-[8px] bg-[#fff3e0] border border-[#ffe0b2]">
          <Lock size={14} className="text-[#ff9800]" />
          <span className="text-[12px] font-medium text-[#ff9800]">
            This intent spec is locked and cannot be edited.
          </span>
        </div>
      )}

      {/* Goal */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[6px]">
          Goal <span className="text-[#e74c3c]">*</span>
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={isLocked}
          placeholder="Describe the intent goal..."
          rows={3}
          className={cn(
            'w-full px-[12px] py-[10px] rounded-[8px] border border-[#e8e8e8] text-[13px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors resize-none',
            isLocked && 'bg-[#f5f5f0] cursor-not-allowed',
          )}
        />
      </div>

      {/* Intent type (for new) */}
      {!intentId && (
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[6px]">
            Intent Type
          </label>
          <input
            type="text"
            value={intentType}
            onChange={(e) => setIntentType(e.target.value)}
            placeholder="e.g. sim.fea"
            className="w-full h-[38px] px-[12px] rounded-[8px] border border-[#e8e8e8] text-[13px] text-[#1a1a1a] font-mono placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
          />
        </div>
      )}

      {/* Inputs */}
      <div>
        <div className="flex items-center justify-between mb-[8px]">
          <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
            Inputs
          </label>
          {!isLocked && (
            <button
              type="button"
              onClick={addInput}
              className="text-[11px] text-[#ff9800] font-medium flex items-center gap-[4px] hover:underline"
            >
              <Plus size={12} /> Add Input
            </button>
          )}
        </div>

        <div className="flex flex-col gap-[6px]">
          {inputs.map((inp, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_100px_40px_28px] gap-[6px] items-center">
              <input
                type="text"
                value={inp.name}
                onChange={(e) => updateInput(idx, 'name', e.target.value)}
                disabled={isLocked}
                placeholder="Input name"
                className="h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors disabled:bg-[#f5f5f0]"
              />
              <select
                value={inp.type ?? 'string'}
                onChange={(e) => updateInput(idx, 'type', e.target.value)}
                disabled={isLocked}
                className="h-[34px] px-[8px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] bg-white focus:outline-none focus:border-[#ff9800] transition-colors disabled:bg-[#f5f5f0]"
              >
                {INPUT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <label className="flex items-center gap-[4px] text-[10px] text-[#6b6b6b]">
                <input
                  type="checkbox"
                  checked={inp.required}
                  onChange={(e) => updateInput(idx, 'required', e.target.checked)}
                  disabled={isLocked}
                  className="rounded"
                />
                Req
              </label>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => removeInput(idx)}
                  className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[#acacac] hover:text-[#e74c3c] hover:bg-[#ffebee] transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Acceptance Criteria */}
      <div>
        <div className="flex items-center justify-between mb-[8px]">
          <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
            Acceptance Criteria
          </label>
          {!isLocked && (
            <button
              type="button"
              onClick={addCriterion}
              className="text-[11px] text-[#ff9800] font-medium flex items-center gap-[4px] hover:underline"
            >
              <Plus size={12} /> Add Criterion
            </button>
          )}
        </div>

        <div className="flex flex-col gap-[6px]">
          {criteria.map((c, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_90px_80px_60px_28px] gap-[6px] items-center">
              <input
                type="text"
                value={c.metric}
                onChange={(e) => updateCriterion(idx, 'metric', e.target.value)}
                disabled={isLocked}
                placeholder="Metric"
                className="h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] font-mono text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors disabled:bg-[#f5f5f0]"
              />
              <select
                value={c.operator}
                onChange={(e) => updateCriterion(idx, 'operator', e.target.value)}
                disabled={isLocked}
                className="h-[34px] px-[8px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] bg-white focus:outline-none focus:border-[#ff9800] transition-colors disabled:bg-[#f5f5f0]"
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              <input
                type="number"
                value={c.threshold as number ?? ''}
                onChange={(e) => updateCriterion(idx, 'threshold', Number(e.target.value))}
                disabled={isLocked}
                placeholder="Threshold"
                className="h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors disabled:bg-[#f5f5f0]"
              />
              <input
                type="text"
                value={c.unit ?? ''}
                onChange={(e) => updateCriterion(idx, 'unit', e.target.value)}
                disabled={isLocked}
                placeholder="Unit"
                className="h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors disabled:bg-[#f5f5f0]"
              />
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => removeCriterion(idx)}
                  className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[#acacac] hover:text-[#e74c3c] hover:bg-[#ffebee] transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Governance */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[8px]">
          Governance
        </label>
        <div className="grid grid-cols-2 gap-[12px]">
          <div>
            <label className="text-[10px] text-[#6b6b6b] block mb-[4px]">Level</label>
            <select
              value={govLevel}
              onChange={(e) => setGovLevel(e.target.value as typeof govLevel)}
              disabled={isLocked}
              className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] bg-white focus:outline-none focus:border-[#ff9800] transition-colors disabled:bg-[#f5f5f0]"
            >
              {GOVERNANCE_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#6b6b6b] block mb-[4px]">
              Approval Roles (comma-separated)
            </label>
            <input
              type="text"
              value={approvalRoles}
              onChange={(e) => setApprovalRoles(e.target.value)}
              disabled={isLocked}
              placeholder="e.g. senior_engineer, qa_lead"
              className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors disabled:bg-[#f5f5f0]"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isLocked && (
        <div className="flex items-center gap-[8px] pt-[8px] border-t border-[#f0f0ec]">
          <button
            type="button"
            onClick={handleSave}
            disabled={!goal.trim() || createIntent.isPending}
            className={cn(
              'h-[34px] px-[16px] rounded-[8px] text-[12px] font-semibold text-white transition-colors flex items-center gap-[6px]',
              !goal.trim() || createIntent.isPending
                ? 'bg-[#d0d0d0] cursor-not-allowed'
                : 'bg-[#ff9800] hover:bg-[#f57c00]',
            )}
          >
            {createIntent.isPending && <Loader2 size={14} className="animate-spin" />}
            <Save size={12} />
            Save Draft
          </button>

          {intentId && (
            <>
              <button
                type="button"
                onClick={() => setShowLockConfirm(true)}
                disabled={lockIntent.isPending}
                className="h-[34px] px-[16px] rounded-[8px] text-[12px] font-medium text-[#ff9800] border border-[#ff9800] hover:bg-[#fff3e0] transition-colors flex items-center gap-[6px]"
              >
                {lockIntent.isPending && <Loader2 size={14} className="animate-spin" />}
                <Lock size={12} />
                Lock Intent
              </button>

              {showLockConfirm && (
                <div className="flex items-center gap-[6px] p-[8px] rounded-[8px] bg-[#fff8e1] border border-[#ffe0b2]">
                  <AlertTriangle size={12} className="text-[#ff9800]" />
                  <span className="text-[11px] text-[#ff9800]">Lock permanently?</span>
                  <button
                    type="button"
                    onClick={handleLock}
                    className="h-[24px] px-[10px] rounded-[4px] bg-[#ff9800] text-white text-[10px] font-medium hover:bg-[#f57c00] transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLockConfirm(false)}
                    className="h-[24px] px-[10px] rounded-[4px] border border-[#e8e8e8] text-[#6b6b6b] text-[10px] font-medium hover:bg-[#f0f0ec] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
