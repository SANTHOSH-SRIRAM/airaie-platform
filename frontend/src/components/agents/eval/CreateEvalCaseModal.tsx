// E-Evals: Create-eval-case modal.
//
// The kernel's `evaluateCriteria` only inspects four keys —
//   min_score, max_cost, max_actions, required_tools
// — so the rubric editor exposes those four directly. Any unrecognised
// criterion key would be silently ignored by the runner; we therefore
// don't bother with an arbitrary metric/operator/threshold builder here.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import Button from '@components/ui/Button';
import { useCreateEvalCase } from '@hooks/useAgentEvals';
import type { EvalCriteria } from '@api/agentEvals';
import { cn } from '@utils/cn';

interface CreateEvalCaseModalProps {
  open: boolean;
  agentId: string;
  onClose: () => void;
  onCreated?: (caseId: string) => void;
}

interface ModalState {
  name: string;
  inputsText: string;             // raw JSON string the user types
  minScore: string;
  maxCost: string;
  maxActions: string;
  requiredTools: string[];
}

const INITIAL: ModalState = {
  name: '',
  inputsText: '{\n  "task": ""\n}',
  minScore: '',
  maxCost: '',
  maxActions: '',
  requiredTools: [],
};

export default function CreateEvalCaseModal({
  open,
  agentId,
  onClose,
  onCreated,
}: CreateEvalCaseModalProps) {
  const [state, setState] = useState<ModalState>(INITIAL);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const createMut = useCreateEvalCase(agentId);

  // Reset on open + body-scroll lock + initial focus.
  useEffect(() => {
    if (!open) return;
    setState(INITIAL);
    setSubmitError(null);
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => firstInputRef.current?.focus(), 50);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = '';
    };
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus trap.
  useEffect(() => {
    if (!open) return;
    function onTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const els = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onTab);
    return () => document.removeEventListener('keydown', onTab);
  }, [open]);

  // Validate inputs JSON live.
  const inputsParse = useMemo(() => {
    try {
      const parsed = JSON.parse(state.inputsText);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false as const, error: 'Inputs must be a JSON object.' };
      }
      return { ok: true as const, value: parsed as Record<string, unknown> };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [state.inputsText]);

  if (!open) return null;

  const isPending = createMut.isPending;

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!state.name.trim()) {
      setSubmitError('Name is required.');
      return;
    }
    if (!inputsParse.ok) {
      setSubmitError(`Invalid inputs JSON: ${inputsParse.error}`);
      return;
    }
    const criteria: EvalCriteria = {};
    if (state.minScore.trim() !== '') {
      const v = Number(state.minScore);
      if (Number.isFinite(v)) criteria.min_score = v;
    }
    if (state.maxCost.trim() !== '') {
      const v = Number(state.maxCost);
      if (Number.isFinite(v)) criteria.max_cost = v;
    }
    if (state.maxActions.trim() !== '') {
      const v = Number(state.maxActions);
      if (Number.isFinite(v)) criteria.max_actions = Math.floor(v);
    }
    const tools = state.requiredTools.filter((t) => t.trim() !== '');
    if (tools.length > 0) criteria.required_tools = tools;

    try {
      const created = await createMut.mutateAsync({
        name: state.name.trim(),
        inputs: inputsParse.value,
        criteria,
      });
      onCreated?.(created.id);
      onClose();
    } catch (err) {
      const msg =
        (err as { message?: string } | undefined)?.message ??
        (err instanceof Error ? err.message : 'Failed to create eval case');
      setSubmitError(msg);
    }
  };

  const setRequiredTool = (idx: number, value: string) => {
    setState((s) => {
      const next = [...s.requiredTools];
      next[idx] = value;
      return { ...s, requiredTools: next };
    });
  };
  const addRequiredTool = () =>
    setState((s) => ({ ...s, requiredTools: [...s.requiredTools, ''] }));
  const removeRequiredTool = (idx: number) =>
    setState((s) => ({
      ...s,
      requiredTools: s.requiredTools.filter((_, i) => i !== idx),
    }));

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-eval-case-title"
        className="relative flex flex-col w-full max-w-[640px] max-h-[calc(100vh-80px)] bg-white rounded-[16px] shadow-[0px_24px_48px_rgba(0,0,0,0.16)] overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-[24px] py-[18px] border-b border-[#ece9e3]">
          <h2
            id="create-eval-case-title"
            className="text-[15px] font-semibold text-[#1a1a1a]"
          >
            New Eval Case
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-[28px] h-[28px] flex items-center justify-center rounded-full text-[#8e8a84] hover:bg-[#f5f3ef] hover:text-[#1a1a1a]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-[24px] py-[20px] space-y-[18px]">
          {/* Name */}
          <Field label="Name" required>
            <input
              ref={firstInputRef}
              type="text"
              value={state.name}
              onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Hello-world happy path"
              disabled={isPending}
              className={inputClass}
            />
          </Field>

          {/* Inputs JSON */}
          <Field
            label="Inputs (JSON)"
            required
            hint="Object passed to the agent's first turn. Must be a JSON object."
          >
            <textarea
              value={state.inputsText}
              onChange={(e) => setState((s) => ({ ...s, inputsText: e.target.value }))}
              spellCheck={false}
              rows={8}
              disabled={isPending}
              className={cn(
                inputClass,
                'font-mono text-[12px] resize-y',
                !inputsParse.ok && 'border-[#e57373] focus:border-[#e57373]',
              )}
            />
            {!inputsParse.ok && (
              <p className="mt-1 text-[11px] text-[#c0392b]">{inputsParse.error}</p>
            )}
          </Field>

          {/* Acceptance criteria */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-[10px]">
              Acceptance Criteria (optional)
            </p>
            <div className="grid grid-cols-3 gap-[10px]">
              <Field label="Min score" hint="0..1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={state.minScore}
                  onChange={(e) => setState((s) => ({ ...s, minScore: e.target.value }))}
                  placeholder="0.7"
                  disabled={isPending}
                  className={inputClass}
                />
              </Field>
              <Field label="Max cost ($)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={state.maxCost}
                  onChange={(e) => setState((s) => ({ ...s, maxCost: e.target.value }))}
                  placeholder="0.05"
                  disabled={isPending}
                  className={inputClass}
                />
              </Field>
              <Field label="Max actions">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={state.maxActions}
                  onChange={(e) => setState((s) => ({ ...s, maxActions: e.target.value }))}
                  placeholder="5"
                  disabled={isPending}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-[14px]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[#1a1a1a]">Required tools</span>
                <button
                  type="button"
                  onClick={addRequiredTool}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 text-[12px] text-[#1976d2] hover:underline"
                >
                  <Plus size={12} /> Add tool
                </button>
              </div>
              {state.requiredTools.length === 0 ? (
                <p className="mt-1 text-[11px] text-[#8e8a84]">
                  Optional. Use the full <span className="font-mono">tool_id@version</span> form.
                </p>
              ) : (
                <div className="mt-[8px] space-y-[6px]">
                  {state.requiredTools.map((tool, idx) => (
                    <div key={idx} className="flex items-center gap-[6px]">
                      <input
                        type="text"
                        value={tool}
                        onChange={(e) => setRequiredTool(idx, e.target.value)}
                        placeholder="hello-world@0.1.0"
                        disabled={isPending}
                        className={cn(inputClass, 'font-mono text-[12px]')}
                      />
                      <button
                        type="button"
                        onClick={() => removeRequiredTool(idx)}
                        aria-label="Remove tool"
                        className="p-[6px] text-[#8e8a84] hover:text-[#c0392b]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {submitError && (
            <div
              role="alert"
              className="rounded-[8px] bg-[#fdecea] border border-[#f5c2c0] px-[12px] py-[10px] text-[12px] text-[#c0392b]"
            >
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-[8px] h-[60px] px-[24px] border-t border-[#ece9e3] bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-[34px] px-[14px] text-[12px] text-[#6b6b6b] hover:text-[#1a1a1a]"
          >
            Cancel
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isPending}
            icon={isPending ? <Loader2 className="animate-spin" /> : undefined}
          >
            Create Eval Case
          </Button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full h-[34px] px-[10px] rounded-[8px] border border-[#ece9e3] bg-white text-[12px] text-[#1a1a1a] placeholder:text-[#bfbcb6] focus:outline-none focus:border-[#1976d2] disabled:bg-[#fafaf8] disabled:text-[#8e8a84]';

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-[#1a1a1a]">
        {label}
        {required && <span className="ml-1 text-[#c0392b]">*</span>}
      </span>
      <div className="mt-[6px]">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-[#8e8a84]">{hint}</p>}
    </label>
  );
}
