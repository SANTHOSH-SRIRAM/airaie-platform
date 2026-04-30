import { memo, useEffect, useMemo, useState } from 'react';
import type { PlanNode } from '@/types/plan';

// ---------------------------------------------------------------------------
// EditParametersDrawer — right-rail drawer that edits one editable plan node's
// parameters (Phase 11 Plan C2). Mounted from the Method-stage tool chip when
// the card mode permits (`useCardModeRules.canChangePipeline`). On submit
// posts an `update_parameters` PlanEdit through `useEditPlan`; the kernel
// merges values into node.parameters and resets the plan to draft.
//
// Schema-driven where possible: input types follow the live parameter values
// (number → number input, boolean → checkbox, string → text). Object/array
// values are surfaced as raw JSON textareas so power users can still edit
// them; ATP `tool.contract.config_template` consultation for strict schema
// validation is a follow-up — kept out of scope until at least one tool
// declares a usable schema.
//
// Layout mirrors BranchSweepDrawer / ArtifactPickerDrawer.
// ---------------------------------------------------------------------------

export interface EditParametersSubmitPayload {
  node_id: string;
  parameters: Record<string, unknown>;
}

interface EditParametersDrawerProps {
  open: boolean;
  /** The plan node being edited — the drawer reads its parameters and
   *  whether it's editable. Tool chip click sites pass the resolved node. */
  node: PlanNode | null;
  submitting: boolean;
  errorMessage?: string | null;
  onSubmit: (payload: EditParametersSubmitPayload) => void;
  onClose: () => void;
}

type FieldKind = 'number' | 'boolean' | 'string' | 'json';

interface FieldState {
  key: string;
  kind: FieldKind;
  value: string;
  initialValue: string;
}

function inferKind(value: unknown): FieldKind {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') return 'string';
  return 'json';
}

function serialize(kind: FieldKind, raw: unknown): string {
  if (kind === 'json') return JSON.stringify(raw, null, 2);
  if (kind === 'boolean') return raw ? 'true' : 'false';
  return raw === null || raw === undefined ? '' : String(raw);
}

function parse(kind: FieldKind, text: string): { value: unknown; error: string | null } {
  if (kind === 'number') {
    const t = text.trim();
    if (t === '') return { value: 0, error: 'required' };
    const n = Number(t);
    if (!Number.isFinite(n)) return { value: 0, error: 'not a number' };
    return { value: n, error: null };
  }
  if (kind === 'boolean') {
    return { value: text === 'true', error: null };
  }
  if (kind === 'json') {
    const t = text.trim();
    if (t === '') return { value: null, error: null };
    try {
      return { value: JSON.parse(t), error: null };
    } catch (err) {
      return { value: null, error: (err as Error).message };
    }
  }
  return { value: text, error: null };
}

function buildInitialFields(node: PlanNode | null): FieldState[] {
  if (!node) return [];
  const entries = Object.entries(node.parameters ?? {});
  return entries.map(([key, val]) => {
    const kind = inferKind(val);
    const text = serialize(kind, val);
    return { key, kind, value: text, initialValue: text };
  });
}

function EditParametersDrawerImpl({
  open,
  node,
  submitting,
  errorMessage,
  onSubmit,
  onClose,
}: EditParametersDrawerProps) {
  const [fields, setFields] = useState<FieldState[]>([]);

  useEffect(() => {
    if (!open) {
      setFields([]);
      return;
    }
    setFields(buildInitialFields(node));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, node, onClose]);

  const parsed = useMemo(() => {
    const out = new Map<string, { value: unknown; error: string | null }>();
    for (const f of fields) {
      out.set(f.key, parse(f.kind, f.value));
    }
    return out;
  }, [fields]);

  const dirty = useMemo(() => fields.some((f) => f.value !== f.initialValue), [fields]);
  const anyError = useMemo(() => {
    for (const [, p] of parsed) if (p.error) return true;
    return false;
  }, [parsed]);
  const canSubmit = open && !submitting && !!node && dirty && !anyError;

  const handleSubmit = () => {
    if (!canSubmit || !node) return;
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const p = parsed.get(f.key);
      if (!p || p.error) continue;
      out[f.key] = p.value;
    }
    onSubmit({ node_id: node.node_id, parameters: out });
  };

  if (!open) return null;

  const notEditable = !!node && !node.is_editable;
  const empty = !!node && fields.length === 0;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label={`Edit parameters for ${node?.tool_id ?? 'node'}`}
        className="fixed inset-y-0 right-0 z-50 flex w-[460px] max-w-full flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-[12px] border-b border-[#ebebe6] px-[24px] py-[20px]">
          <div className="flex flex-col gap-[4px]">
            <span className="font-sans text-[11px] uppercase tracking-wide text-[#554433]/70">
              Edit parameters
            </span>
            <h2 className="font-sans text-[18px] font-medium text-[#1a1c19]">
              <span className="font-mono text-[#8b5000]">{node?.tool_id ?? '—'}</span>
            </h2>
            {node ? (
              <span className="font-mono text-[11px] text-[#554433]/70">
                node {node.node_id} · v{node.tool_version}
              </span>
            ) : null}
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
          {!node ? (
            <p className="font-sans text-[13px] text-[#554433]/70">No node selected.</p>
          ) : notEditable ? (
            <p className="rounded-[10px] bg-[#fff7e6] px-[14px] py-[12px] font-sans text-[13px] text-[#8b5000]">
              This node isn't editable. Validation / governance / approval nodes
              are protected by the kernel.
            </p>
          ) : empty ? (
            <p className="rounded-[10px] bg-[#fff7e6] px-[14px] py-[12px] font-sans text-[13px] text-[#8b5000]">
              This node has no parameters to edit.
            </p>
          ) : (
            <div className="flex flex-col gap-[14px]">
              {fields.map((f, i) => {
                const p = parsed.get(f.key);
                const err = p?.error ?? null;
                return (
                  <label key={f.key} className="flex flex-col gap-[6px]">
                    <span className="flex items-center justify-between">
                      <span className="font-mono text-[12px] font-medium text-[#1a1c19]">
                        {f.key}
                      </span>
                      <span className="font-mono text-[10px] uppercase text-[#554433]/55">
                        {f.kind}
                      </span>
                    </span>
                    {f.kind === 'boolean' ? (
                      <select
                        value={f.value}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFields((prev) =>
                            prev.map((p2, idx) => (idx === i ? { ...p2, value: v } : p2)),
                          );
                        }}
                        className="rounded-[10px] bg-[#f5f5f0] px-[14px] py-[10px] font-mono text-[13px] text-[#1a1c19] focus:outline-none focus:ring-2 focus:ring-[#ff9800]/30"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : f.kind === 'json' ? (
                      <textarea
                        rows={4}
                        value={f.value}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFields((prev) =>
                            prev.map((p2, idx) => (idx === i ? { ...p2, value: v } : p2)),
                          );
                        }}
                        className="resize-y rounded-[10px] bg-[#f5f5f0] px-[14px] py-[10px] font-mono text-[12px] text-[#1a1c19] focus:outline-none focus:ring-2 focus:ring-[#ff9800]/30"
                      />
                    ) : (
                      <input
                        type={f.kind === 'number' ? 'number' : 'text'}
                        step={f.kind === 'number' ? 'any' : undefined}
                        value={f.value}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFields((prev) =>
                            prev.map((p2, idx) => (idx === i ? { ...p2, value: v } : p2)),
                          );
                        }}
                        className="rounded-[10px] bg-[#f5f5f0] px-[14px] py-[10px] font-mono text-[13px] text-[#1a1c19] focus:outline-none focus:ring-2 focus:ring-[#ff9800]/30"
                      />
                    )}
                    {err ? (
                      <span className="font-sans text-[11px] text-[#cc3326]">{err}</span>
                    ) : f.value !== f.initialValue ? (
                      <span className="font-sans text-[11px] text-[#8b5000]">
                        was: <span className="font-mono">{f.initialValue || '<empty>'}</span>
                      </span>
                    ) : null}
                  </label>
                );
              })}
              {errorMessage ? (
                <p className="rounded-[10px] border-l-[3px] border-[#cc3326]/50 bg-[#cc3326]/[0.04] px-[14px] py-[10px] font-sans text-[12px] text-[#1a1c19]">
                  {errorMessage}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-[12px] border-t border-[#ebebe6] px-[24px] py-[12px]">
          <span className="font-sans text-[11px] text-[#554433]/60">
            {dirty ? 'plan resets to draft on save' : 'no changes yet'} · ESC to close
          </span>
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
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}

export const EditParametersDrawer = memo(EditParametersDrawerImpl);
export default EditParametersDrawer;
