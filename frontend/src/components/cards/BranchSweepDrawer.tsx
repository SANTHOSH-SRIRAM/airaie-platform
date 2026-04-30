import { memo, useEffect, useMemo, useState } from 'react';
import type { ExecutionPlan, PlanNode } from '@/types/plan';
import type { Card } from '@/types/card';

// ---------------------------------------------------------------------------
// BranchSweepDrawer — right-rail drawer that lets the user fan out a single
// analysis card into a parametric sweep (Phase 11 Wave D, Plan A).
//
// Reads the parent card's plan to surface editable parameters; the user picks
// one, enters a value list, and the parent submits a `card_type='sweep'` card
// with `config = { sweep_param, sweep_values, parent_card_id }`. The kernel's
// ExecutePlan path detects the sweep config and fans out one run per value.
//
// Layout mirrors ArtifactPickerDrawer.tsx — same scrim, header, scrollable
// body, sticky footer, ESC-to-close shortcut.
// ---------------------------------------------------------------------------

export interface SweepSubmitPayload {
  title: string;
  sweep_param: string;
  sweep_values: number[];
}

interface BranchSweepDrawerProps {
  open: boolean;
  parentCard: Card;
  plan: ExecutionPlan | undefined;
  submitting: boolean;
  errorMessage?: string | null;
  onSubmit: (payload: SweepSubmitPayload) => void;
  onClose: () => void;
}

interface EditableParam {
  /** dotted path used in card.config.sweep_param: "{node_id}.{key}" */
  path: string;
  nodeId: string;
  nodeLabel: string;
  paramKey: string;
  currentValue: unknown;
}

function flattenEditableParams(plan: ExecutionPlan | undefined): EditableParam[] {
  if (!plan) return [];
  const out: EditableParam[] = [];
  for (const node of plan.nodes as PlanNode[]) {
    if (!node.is_editable) continue;
    for (const [key, val] of Object.entries(node.parameters ?? {})) {
      // Sweep values are always entered as numbers in the form, but the
      // current parameter type can be anything — most pipeline tools (e.g.
      // OpenFOAM) surface string/object params, and the user typically wants
      // to sweep a parameter whose value they're about to change.
      out.push({
        path: `${node.node_id}.${key}`,
        nodeId: node.node_id,
        nodeLabel: node.tool_id || node.node_id,
        paramKey: key,
        currentValue: val,
      });
    }
  }
  // Sort numeric params first so the dropdown defaults to something
  // sweepable. Stable beyond that to preserve plan order.
  out.sort((a, b) => {
    const an = typeof a.currentValue === 'number' ? 0 : 1;
    const bn = typeof b.currentValue === 'number' ? 0 : 1;
    return an - bn;
  });
  return out;
}

function parseValues(input: string): { values: number[]; error: string | null } {
  const tokens = input
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length < 2) {
    return { values: [], error: 'Enter at least 2 values, comma-separated.' };
  }
  const values: number[] = [];
  for (const t of tokens) {
    const n = Number(t);
    if (!Number.isFinite(n)) {
      return { values: [], error: `"${t}" is not a number.` };
    }
    values.push(n);
  }
  const seen = new Set<number>();
  for (const v of values) {
    if (seen.has(v)) {
      return { values: [], error: 'Values must be distinct.' };
    }
    seen.add(v);
  }
  return { values, error: null };
}

function BranchSweepDrawerImpl({
  open,
  parentCard,
  plan,
  submitting,
  errorMessage,
  onSubmit,
  onClose,
}: BranchSweepDrawerProps) {
  const params = useMemo(() => flattenEditableParams(plan), [plan]);
  const [paramPath, setParamPath] = useState('');
  const [valuesText, setValuesText] = useState('');
  const [titleText, setTitleText] = useState('');

  // Pick a sensible default param + suggested values once the drawer opens.
  useEffect(() => {
    if (!open) return;
    if (params.length === 0) return;
    if (paramPath) return;
    // Prefer a numeric parameter for the default — those are the natural
    // sweep targets. Fall back to the first param if none are numeric.
    const numeric = params.find((p) => typeof p.currentValue === 'number');
    const first = numeric ?? params[0];
    setParamPath(first.path);
    if (typeof first.currentValue === 'number') {
      const cur = first.currentValue;
      // Suggest a 3-sample sweep around the current value: 0.5×, 1×, 2×.
      const sampled = [cur * 0.5, cur, cur * 2].map((n) =>
        Number.isInteger(cur) ? Math.round(n) : Number(n.toFixed(4)),
      );
      setValuesText(sampled.join(', '));
    } else {
      setValuesText('');
    }
    setTitleText(`${parentCard.title} — sweep ${first.paramKey}`);
  }, [open, params, paramPath, parentCard.title]);

  // Reset on close + ESC handling.
  useEffect(() => {
    if (!open) {
      setParamPath('');
      setValuesText('');
      setTitleText('');
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const parsed = useMemo(() => parseValues(valuesText), [valuesText]);
  const trimmedTitle = titleText.trim();
  const canSubmit =
    !submitting && !!paramPath && parsed.error === null && trimmedTitle.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: trimmedTitle,
      sweep_param: paramPath,
      sweep_values: parsed.values,
    });
  };

  if (!open) return null;

  const noPlan = !plan;
  const noEditable = !!plan && params.length === 0;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label={`Branch ${parentCard.title} into a parametric sweep`}
        className="fixed inset-y-0 right-0 z-50 flex w-[460px] max-w-full flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-[12px] border-b border-[#ebebe6] px-[24px] py-[20px]">
          <div className="flex flex-col gap-[4px]">
            <span className="font-sans text-[11px] uppercase tracking-wide text-[#554433]/70">
              Branch into sweep
            </span>
            <h2 className="font-sans text-[18px] font-medium text-[#1a1c19]">
              ⤵ <span className="font-mono text-[#8b5000]">{parentCard.title}</span>
            </h2>
            <span className="font-sans text-[11px] text-[#554433]/70">
              Creates a new sweep card; one run per value.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-[6px] -mt-[4px] rounded-[8px] p-[6px] font-mono text-[14px] text-[#554433]/60 hover:bg-[#f5f5f0]"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-[24px] py-[16px]">
          {noPlan ? (
            <p className="rounded-[10px] bg-[#fff7e6] px-[14px] py-[12px] font-sans text-[13px] text-[#8b5000]">
              No plan yet on this card. Generate + validate a plan before
              branching into a sweep — the sweep needs editable parameters from
              the plan.
            </p>
          ) : noEditable ? (
            <p className="rounded-[10px] bg-[#fff7e6] px-[14px] py-[12px] font-sans text-[13px] text-[#8b5000]">
              This plan has no editable parameters across its nodes. Add
              parameters to the pipeline tools first, or pick a different
              pipeline.
            </p>
          ) : (
            <div className="flex flex-col gap-[18px]">
              <label className="flex flex-col gap-[6px]">
                <span className="font-sans text-[11px] uppercase tracking-wide text-[#554433]/70">
                  Parameter
                </span>
                <select
                  value={paramPath}
                  onChange={(e) => setParamPath(e.target.value)}
                  className="rounded-[10px] bg-[#f5f5f0] px-[14px] py-[10px] font-mono text-[13px] text-[#1a1c19] focus:outline-none focus:ring-2 focus:ring-[#ff9800]/30"
                >
                  {params.map((p) => {
                    const t = typeof p.currentValue;
                    const preview =
                      t === 'number' || t === 'string' || t === 'boolean'
                        ? String(p.currentValue)
                        : t;
                    return (
                      <option key={p.path} value={p.path}>
                        {p.paramKey}  ·  {p.nodeLabel}  ·  current={preview}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="flex flex-col gap-[6px]">
                <span className="font-sans text-[11px] uppercase tracking-wide text-[#554433]/70">
                  Values
                </span>
                <input
                  type="text"
                  value={valuesText}
                  onChange={(e) => setValuesText(e.target.value)}
                  placeholder="e.g. 120, 200, 320"
                  className="rounded-[10px] bg-[#f5f5f0] px-[14px] py-[10px] font-mono text-[13px] text-[#1a1c19] placeholder:text-[#554433]/45 focus:outline-none focus:ring-2 focus:ring-[#ff9800]/30"
                />
                {parsed.error ? (
                  <span className="font-sans text-[11px] text-[#cc3326]">{parsed.error}</span>
                ) : (
                  <span className="font-sans text-[11px] text-[#554433]/70">
                    Distinct numbers, comma-separated. {parsed.values.length} runs will be created.
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-[6px]">
                <span className="font-sans text-[11px] uppercase tracking-wide text-[#554433]/70">
                  New card title
                </span>
                <input
                  type="text"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  className="rounded-[10px] bg-[#f5f5f0] px-[14px] py-[10px] font-sans text-[13px] text-[#1a1c19] focus:outline-none focus:ring-2 focus:ring-[#ff9800]/30"
                />
              </label>

              {errorMessage ? (
                <p className="rounded-[10px] border-l-[3px] border-[#cc3326]/50 bg-[#cc3326]/[0.04] px-[14px] py-[10px] font-sans text-[12px] text-[#1a1c19]">
                  {errorMessage}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-[12px] border-t border-[#ebebe6] px-[24px] py-[12px]">
          <span className="font-sans text-[11px] text-[#554433]/60">ESC to close</span>
          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[6px] border border-[#1a1c19]/15 bg-white px-[14px] py-[7px] font-sans text-[12px] text-[#1a1c19] transition-colors hover:bg-[#f5f5f0]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="rounded-[6px] bg-[#1976d2] px-[14px] py-[7px] font-sans text-[12px] font-medium text-white transition-colors hover:bg-[#1976d2]/90 disabled:cursor-not-allowed disabled:bg-[#1976d2]/30"
            >
              {submitting ? 'Creating…' : `Create sweep (${parsed.values.length || 0})`}
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}

export const BranchSweepDrawer = memo(BranchSweepDrawerImpl);
export default BranchSweepDrawer;
