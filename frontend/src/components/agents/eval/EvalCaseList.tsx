// E-Evals: list of saved eval cases for an agent.
import { useMemo, useState } from 'react';
import { Loader2, Plus, Search, Trash2, FlaskConical } from 'lucide-react';
import { useAgentEvalCases, useDeleteEvalCase } from '@hooks/useAgentEvals';
import type { AgentEvalCase, EvalRunResponse } from '@api/agentEvals';
import { normaliseStatus } from '@utils/evalRun';
import { cn } from '@utils/cn';

interface EvalCaseListProps {
  agentId: string;
  /** Selected case ids — when empty, "Run All" is implied. */
  selected: string[];
  onSelectionChange: (next: string[]) => void;
  onCreateClick: () => void;
  /** Most-recent run, used to render last-run status badges per row. */
  lastRun?: EvalRunResponse | null;
}

export default function EvalCaseList({
  agentId,
  selected,
  onSelectionChange,
  onCreateClick,
  lastRun,
}: EvalCaseListProps) {
  const { data: cases = [], isLoading, error } = useAgentEvalCases(agentId);
  const deleteMut = useDeleteEvalCase(agentId);
  const [query, setQuery] = useState('');

  const lastRunByCaseId = useMemo(() => {
    const m = new Map<string, ReturnType<typeof normaliseStatus>>();
    if (lastRun) {
      for (const r of lastRun.results) {
        m.set(r.eval_case_id, normaliseStatus(r.status));
      }
    }
    return m;
  }, [lastRun]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((c) => c.name.toLowerCase().includes(q));
  }, [cases, query]);

  const allSelected = filtered.length > 0 && selected.length === filtered.length;
  const someSelected = selected.length > 0 && selected.length < filtered.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filtered.map((c) => c.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selected.includes(id)) {
      onSelectionChange(selected.filter((x) => x !== id));
    } else {
      onSelectionChange([...selected, id]);
    }
  };

  const handleDelete = async (c: AgentEvalCase, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete eval case "${c.name}"?`)) return;
    try {
      await deleteMut.mutateAsync(c.id);
      onSelectionChange(selected.filter((x) => x !== c.id));
    } catch {
      /* surface in mutation toast if/when wired up */
    }
  };

  return (
    <section className="rounded-[14px] border border-[#ece9e3] bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-[16px] py-[12px] border-b border-[#ece9e3]">
        <h3 className="text-[15px] font-semibold text-[#1a1a1a]">Eval Cases</h3>
        <span className="text-[12px] text-[#8e8a84]">{cases.length}</span>

        <div className="flex-1 min-w-[180px] max-w-[320px] ml-auto">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#bfbcb6]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              className="w-full h-[30px] pl-[28px] pr-[10px] rounded-[8px] border border-[#ece9e3] bg-white text-[12px] focus:outline-none focus:border-[#1976d2]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onCreateClick}
          className="inline-flex items-center gap-1.5 h-[30px] px-[12px] rounded-[8px] bg-[#1976d2] text-white text-[12px] font-medium hover:bg-[#1565c0]"
        >
          <Plus size={12} /> New Case
        </button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-[48px]">
          <Loader2 size={18} className="animate-spin text-[#8e8a84]" />
        </div>
      ) : error ? (
        <div className="px-[16px] py-[24px] text-[12px] text-[#c0392b]">
          Failed to load eval cases: {(error as Error).message}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-[40px] px-[16px] text-center">
          <FlaskConical size={22} className="text-[#bfbcb6] mb-2" />
          <p className="text-[13px] font-medium text-[#1a1a1a]">
            {cases.length === 0 ? 'No eval cases yet.' : 'No cases match your search.'}
          </p>
          <p className="text-[12px] text-[#8e8a84] mt-1 max-w-[420px]">
            {cases.length === 0
              ? 'Create one to test agent behavior under specific scenarios.'
              : 'Try a different search term.'}
          </p>
          {cases.length === 0 && (
            <button
              type="button"
              onClick={onCreateClick}
              className="mt-3 inline-flex items-center gap-1.5 h-[30px] px-[12px] rounded-[8px] bg-[#1976d2] text-white text-[12px] font-medium hover:bg-[#1565c0]"
            >
              <Plus size={12} /> Create first case
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Table header */}
          <div
            className={cn(
              'grid grid-cols-[28px_minmax(0,2fr)_minmax(0,1.5fr)_88px_60px] gap-3 items-center',
              'px-[14px] py-[8px] border-b border-[#ece9e3]',
              'text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8e8a84]',
            )}
          >
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={toggleAll}
              aria-label="Select all"
            />
            <span>Name</span>
            <span>Inputs</span>
            <span>Last run</span>
            <span className="sr-only">Actions</span>
          </div>

          {filtered.map((c) => {
            const isSelected = selected.includes(c.id);
            const lastStatus = lastRunByCaseId.get(c.id);
            return (
              <div
                key={c.id}
                onClick={() => toggleOne(c.id)}
                className={cn(
                  'grid grid-cols-[28px_minmax(0,2fr)_minmax(0,1.5fr)_88px_60px] gap-3 items-center',
                  'px-[14px] py-[10px] border-b border-[#ece9e3] last:border-b-0 cursor-pointer',
                  isSelected ? 'bg-[#e3f2fd]/40' : 'hover:bg-[#fafaf8]',
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(c.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${c.name}`}
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[#1a1a1a] truncate">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-[#8e8a84] font-mono truncate">
                    {c.id}
                  </div>
                </div>
                <div className="min-w-0 text-[11px] text-[#6b6b6b] font-mono truncate">
                  {summariseInputs(c.inputs)}
                </div>
                <div>
                  {lastStatus ? <StatusPill status={lastStatus} /> : (
                    <span className="text-[11px] text-[#bfbcb6]">—</span>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(c, e)}
                    aria-label={`Delete ${c.name}`}
                    className="p-[6px] text-[#bfbcb6] hover:text-[#c0392b]"
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function summariseInputs(inputs: Record<string, unknown> | undefined): string {
  if (!inputs) return '—';
  try {
    const json = JSON.stringify(inputs);
    return json.length > 80 ? json.slice(0, 77) + '…' : json;
  } catch {
    return '[unserialisable]';
  }
}

function StatusPill({ status }: { status: 'passed' | 'failed' | 'errored' }) {
  const map: Record<typeof status, { label: string; cls: string }> = {
    passed: { label: 'Pass', cls: 'bg-[#e8f5e9] text-[#2e7d32]' },
    failed: { label: 'Fail', cls: 'bg-[#fdecea] text-[#c0392b]' },
    errored: { label: 'Error', cls: 'bg-[#fff4e5] text-[#b76e00]' },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-medium',
        s.cls,
      )}
    >
      {s.label}
    </span>
  );
}
