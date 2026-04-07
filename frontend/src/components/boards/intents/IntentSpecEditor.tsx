import { useState, useEffect, useMemo } from 'react';
import { cn } from '@utils/cn';
import { useIntent, useCreateIntent, useUpdateIntent, useLockIntent, useIntentTypes } from '@hooks/useIntents';
import type { IntentInput, AcceptanceCriterion, CriterionOperator, IntentConstraint, IntentTypeDefinition } from '@/types/intent';
import { Plus, Trash2, Lock, Save, Loader2, AlertTriangle, ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';

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
// IntentType Tree Browser
// ---------------------------------------------------------------------------

interface TreeNode {
  slug: string;
  name: string;
  description: string;
  category: string;
  children: TreeNode[];
  isLeaf: boolean;
}

function buildTree(types: IntentTypeDefinition[]): TreeNode[] {
  const categories = new Map<string, IntentTypeDefinition[]>();
  for (const t of types) {
    const cat = t.category || 'uncategorized';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(t);
  }

  return Array.from(categories.entries()).map(([cat, items]) => ({
    slug: cat,
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    description: '',
    category: cat,
    isLeaf: false,
    children: items.map((t) => ({
      slug: t.slug,
      name: t.name,
      description: t.description,
      category: t.category,
      children: [],
      isLeaf: true,
    })),
  }));
}

function IntentTypeTreeNode({
  node,
  selected,
  onSelect,
  depth = 0,
}: {
  node: TreeNode;
  selected: string;
  onSelect: (slug: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);

  if (node.isLeaf) {
    return (
      <button
        type="button"
        onClick={() => onSelect(node.slug)}
        className={cn(
          'w-full text-left flex items-center gap-[6px] py-[5px] rounded-[4px] transition-colors',
          selected === node.slug
            ? 'bg-[#fff3e0] text-[#ff9800]'
            : 'text-[#1a1a1a] hover:bg-[#f5f5f0]',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <FileText size={11} className={selected === node.slug ? 'text-[#ff9800]' : 'text-[#acacac]'} />
        <span className="text-[11px] font-medium truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-center gap-[6px] py-[5px] hover:bg-[#f5f5f0] rounded-[4px] transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {expanded ? (
          <ChevronDown size={11} className="text-[#acacac]" />
        ) : (
          <ChevronRight size={11} className="text-[#acacac]" />
        )}
        <Folder size={11} className="text-[#ff9800]" />
        <span className="text-[11px] font-semibold text-[#6b6b6b] uppercase tracking-[0.3px]">
          {node.name}
        </span>
        <span className="text-[9px] text-[#acacac] ml-auto mr-[8px]">{node.children.length}</span>
      </button>
      {expanded && (
        <div>
          {node.children.map((child) => (
            <IntentTypeTreeNode
              key={child.slug}
              node={child}
              selected={selected}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IntentTypeBrowser({
  value,
  onChange,
  disabled,
  verticalSlug = 'engineering',
}: {
  value: string;
  onChange: (slug: string) => void;
  disabled?: boolean;
  verticalSlug?: string;
}) {
  const { data: types, isLoading } = useIntentTypes(verticalSlug);
  const [showTree, setShowTree] = useState(false);

  const tree = useMemo(() => (types ? buildTree(types) : []), [types]);
  const selectedType = types?.find((t) => t.slug === value);

  if (disabled) {
    return (
      <div className="h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] bg-[#f5f5f0] flex items-center text-[12px] font-mono text-[#1a1a1a]">
        {value || 'No intent type'}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowTree(!showTree)}
        className="w-full h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-left text-[12px] font-mono text-[#1a1a1a] flex items-center justify-between hover:border-[#ff9800] transition-colors"
      >
        <span className={value ? 'text-[#1a1a1a]' : 'text-[#acacac]'}>
          {selectedType ? selectedType.name : value || 'Select intent type...'}
        </span>
        <ChevronDown size={12} className="text-[#acacac]" />
      </button>

      {showTree && (
        <div className="absolute z-20 top-[38px] left-0 w-full bg-white border border-[#e8e8e8] rounded-[8px] shadow-[0px_4px_16px_rgba(0,0,0,0.12)] max-h-[220px] overflow-y-auto py-[4px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-[16px]">
              <Loader2 size={14} className="animate-spin text-[#acacac]" />
            </div>
          ) : tree.length === 0 ? (
            <div className="py-[12px] text-center text-[11px] text-[#acacac]">No intent types available</div>
          ) : (
            tree.map((node) => (
              <IntentTypeTreeNode
                key={node.slug}
                node={node}
                selected={value}
                onSelect={(slug) => {
                  onChange(slug);
                  setShowTree(false);
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

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
  const updateIntentMut = useUpdateIntent(intentId ?? '', boardId);
  const lockIntent = useLockIntent(intentId ?? '', boardId);

  const [goal, setGoal] = useState('');
  const [intentType, setIntentType] = useState('');
  const [inputs, setInputs] = useState<IntentInput[]>([]);
  const [constraints, setConstraints] = useState<IntentConstraint[]>([]);
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
      // Load constraints from existing data
      if (existing.constraints) {
        setConstraints(
          Object.entries(existing.constraints).map(([key, value]) => ({
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
          })),
        );
      }
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

  // --- Constraint management ---
  const addConstraint = () => {
    setConstraints((prev) => [...prev, { key: '', value: '' }]);
  };
  const removeConstraint = (idx: number) => setConstraints((prev) => prev.filter((_, i) => i !== idx));
  const updateConstraint = (idx: number, field: 'key' | 'value', value: string) => {
    setConstraints((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  // --- Criteria management ---
  const addCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      { id: `ac_${Date.now()}`, metric: '', operator: 'lte' as CriterionOperator, threshold: 0, unit: '', weight: 1.0 },
    ]);
  };
  const removeCriterion = (idx: number) => setCriteria((prev) => prev.filter((_, i) => i !== idx));
  const updateCriterion = (idx: number, field: string, value: unknown) => {
    setCriteria((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  // --- Save ---
  const isSaving = createIntent.isPending || updateIntentMut.isPending;

  const handleSave = async () => {
    if (!goal.trim()) return;

    // Build constraints object from key-value pairs
    const constraintsObj: Record<string, unknown> = {};
    for (const c of constraints.filter((c) => c.key.trim())) {
      constraintsObj[c.key.trim()] = c.value;
    }

    const payload = {
      goal: goal.trim(),
      inputs: inputs.filter((inp) => inp.name.trim()),
      acceptance_criteria: criteria.filter((c) => c.metric.trim()),
      constraints: Object.keys(constraintsObj).length > 0 ? constraintsObj : undefined,
      governance: {
        level: govLevel,
        approval_roles: approvalRoles
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
      },
    };

    if (intentId) {
      // Update existing intent
      await updateIntentMut.mutateAsync(payload);
    } else {
      // Create new intent
      await createIntent.mutateAsync({
        intent_type: intentType.trim(),
        ...payload,
      });
    }

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

      {/* Intent type browser */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[6px]">
          Intent Type
        </label>
        <IntentTypeBrowser
          value={intentType}
          onChange={setIntentType}
          disabled={isLocked || !!intentId}
        />
      </div>

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

      {/* Constraints key-value editor */}
      <div>
        <div className="flex items-center justify-between mb-[8px]">
          <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
            Constraints
          </label>
          {!isLocked && (
            <button
              type="button"
              onClick={addConstraint}
              className="text-[11px] text-[#ff9800] font-medium flex items-center gap-[4px] hover:underline"
            >
              <Plus size={12} /> Add Constraint
            </button>
          )}
        </div>

        {constraints.length === 0 && (
          <p className="text-[10px] text-[#acacac] italic">No constraints defined</p>
        )}

        <div className="flex flex-col gap-[6px]">
          {constraints.map((c, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_28px] gap-[6px] items-center">
              <input
                type="text"
                value={c.key}
                onChange={(e) => updateConstraint(idx, 'key', e.target.value)}
                disabled={isLocked}
                placeholder="Key"
                className="h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] font-mono text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors disabled:bg-[#f5f5f0]"
              />
              <input
                type="text"
                value={c.value}
                onChange={(e) => updateConstraint(idx, 'value', e.target.value)}
                disabled={isLocked}
                placeholder="Value"
                className="h-[34px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors disabled:bg-[#f5f5f0]"
              />
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => removeConstraint(idx)}
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
            <div key={idx} className="grid grid-cols-[1fr_90px_80px_60px_60px_28px] gap-[6px] items-center">
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
              <input
                type="number"
                value={c.weight ?? ''}
                onChange={(e) => updateCriterion(idx, 'weight', e.target.value ? Number(e.target.value) : undefined)}
                disabled={isLocked}
                placeholder="Weight"
                step="0.1"
                min="0"
                max="1"
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
            disabled={!goal.trim() || isSaving}
            className={cn(
              'h-[34px] px-[16px] rounded-[8px] text-[12px] font-semibold text-white transition-colors flex items-center gap-[6px]',
              !goal.trim() || isSaving
                ? 'bg-[#d0d0d0] cursor-not-allowed'
                : 'bg-[#ff9800] hover:bg-[#f57c00]',
            )}
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            <Save size={12} />
            {intentId ? 'Save Changes' : 'Save Draft'}
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
