// E-Evals: Recent runs table.
//
// G.3.1: backed by persisted eval runs (GET /v0/agents/{id}/eval-runs) via
// `useEvalRuns`. Previously this read from component-local state in
// `EvalRunnerPanel`; that history wiped on tab unmount. Now it survives
// across mounts and tells the audit story.
import { History } from 'lucide-react';
import type { PersistedEvalRun, EvalRunResponse } from '@api/agentEvals';
import { summarizeEvalRun } from '@utils/evalRun';
import { cn } from '@utils/cn';

interface EvalRunsTableProps {
  runs: PersistedEvalRun[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  loading?: boolean;
}

export default function EvalRunsTable({
  runs,
  selectedRunId,
  onSelectRun,
  loading,
}: EvalRunsTableProps) {
  return (
    <section className="rounded-[14px] border border-[#ece9e3] bg-white">
      <div className="flex items-center gap-2 px-[16px] py-[12px] border-b border-[#ece9e3]">
        <History size={14} className="text-[#8e8a84]" />
        <h3 className="text-[15px] font-semibold text-[#1a1a1a]">Recent runs</h3>
        <span className="text-[12px] text-[#8e8a84]">{runs.length}</span>
      </div>

      {loading && runs.length === 0 ? (
        <div className="px-[16px] py-[24px] text-center">
          <p className="text-[12px] text-[#8e8a84]">Loading runs…</p>
        </div>
      ) : runs.length === 0 ? (
        <div className="px-[16px] py-[24px] text-center">
          <p className="text-[12px] text-[#8e8a84]">
            No eval runs yet. Pick cases above and click <span className="font-medium text-[#1a1a1a]">Run Selected</span>.
          </p>
        </div>
      ) : (
        <div>
          <div
            className={cn(
              'grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_72px_64px_72px_72px] gap-3 items-center',
              'px-[14px] py-[8px] border-b border-[#ece9e3]',
              'text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8e8a84]',
            )}
          >
            <span>Run</span>
            <span>Started</span>
            <span>Cases</span>
            <span>Pass</span>
            <span>Fail</span>
            <span>Duration</span>
          </div>

          {runs.map((run) => {
            // Adapt PersistedEvalRun to the shape summarizeEvalRun expects.
            const adapted: EvalRunResponse = {
              eval_run_id: run.id,
              agent_id: run.agent_id,
              version: run.agent_version ?? 1,
              results: run.results ?? [],
              summary: run.summary,
            };
            const digest = summarizeEvalRun(adapted);
            const isActive = selectedRunId === run.id;
            const startedMs = Date.parse(run.started_at);
            return (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelectRun(run.id)}
                className={cn(
                  'w-full text-left',
                  'grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_72px_64px_72px_72px] gap-3 items-center',
                  'px-[14px] py-[10px] border-b border-[#ece9e3] last:border-b-0',
                  isActive ? 'bg-[#e3f2fd]/40' : 'hover:bg-[#fafaf8]',
                )}
              >
                <div className="min-w-0">
                  <div className="font-mono text-[12px] text-[#1a1a1a] truncate">
                    {run.id}
                  </div>
                  <div className="text-[11px] text-[#8e8a84]">v{run.agent_version ?? 1}</div>
                </div>
                <div className="text-[12px] text-[#6b6b6b]">
                  {Number.isFinite(startedMs) ? formatStarted(startedMs) : '—'}
                </div>
                <div className="text-[12px] font-mono text-[#1a1a1a]">{digest.total}</div>
                <div className="text-[12px] font-mono text-[#2e7d32]">{digest.passed}</div>
                <div className="text-[12px] font-mono text-[#c0392b]">
                  {digest.failed + digest.errored}
                </div>
                <div className="text-[12px] font-mono text-[#1a1a1a]">{digest.durationLabel}</div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatStarted(ms: number): string {
  const date = new Date(ms);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString();
  }
  return date.toLocaleString();
}
