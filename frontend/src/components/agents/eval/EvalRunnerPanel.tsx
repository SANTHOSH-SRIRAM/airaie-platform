// E-Evals: composed runner panel — eval-case picker + run-history list +
// run detail. Mounted inside `AgentStudioPage` under the "Evals" tab.
//
// G.3.1: backed by persisted eval runs (`useEvalRuns`). Previously the panel
// kept run history in component state; now history survives tab unmount and
// can be queried by other surfaces. The "just-finished" run still renders
// inline immediately via `runMut.data` while the React-Query invalidation
// pulls the fresh row into the table.
import { useState, useMemo, useEffect } from 'react';
import { FlaskConical, Loader2, Play } from 'lucide-react';
import {
  useAgentEvalCases,
  useEvalRuns,
  useRunAgentEvals,
} from '@hooks/useAgentEvals';
import type { EvalRunResponse, PersistedEvalRun } from '@api/agentEvals';
import EvalCaseList from './EvalCaseList';
import EvalRunsTable from './EvalRunsTable';
import EvalRunDetail from './EvalRunDetail';
import EvalSummary from './EvalSummary';
import CreateEvalCaseModal from './CreateEvalCaseModal';
import { cn } from '@utils/cn';

interface EvalRunnerPanelProps {
  agentId: string;
  /** Optional agent version to pin runs to. Defaults to 1 (kernel default). */
  agentVersion?: number;
}

/** Lift a persisted run into the EvalRunResponse shape consumers expect. */
function persistedToResponse(run: PersistedEvalRun): EvalRunResponse {
  return {
    eval_run_id: run.id,
    agent_id: run.agent_id,
    version: run.agent_version ?? 1,
    results: run.results ?? [],
    summary: run.summary,
  };
}

export default function EvalRunnerPanel({ agentId, agentVersion }: EvalRunnerPanelProps) {
  const { data: cases = [] } = useAgentEvalCases(agentId);
  const { data: persistedRuns = [], isLoading: runsLoading } = useEvalRuns(agentId, { limit: 20 });
  const runMut = useRunAgentEvals(agentId);

  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Auto-select the most-recent persisted run on first load if nothing
  // is selected yet. This makes the panel useful immediately after a tab
  // remount instead of forcing the user to click a row.
  useEffect(() => {
    if (!activeRunId && persistedRuns.length > 0) {
      setActiveRunId(persistedRuns[0].id);
    }
  }, [activeRunId, persistedRuns]);

  // Source-of-truth for what's rendered in the detail/summary blocks. We
  // prefer the in-flight mutation's result so the user sees their just-
  // finished run inline before the cache invalidation lands; otherwise
  // we fall back to the persisted row.
  const activeRun: EvalRunResponse | null = useMemo(() => {
    if (runMut.data && runMut.data.eval_run_id === activeRunId) {
      return runMut.data;
    }
    if (!activeRunId) return null;
    const persisted = persistedRuns.find((r) => r.id === activeRunId);
    return persisted ? persistedToResponse(persisted) : null;
  }, [runMut.data, activeRunId, persistedRuns]);

  const runEvals = async (caseIds?: string[]) => {
    if (!cases.length) return;
    setRunError(null);
    try {
      const ids = caseIds ?? selectedCaseIds;
      const response = await runMut.mutateAsync({
        version: agentVersion ?? 1,
        eval_case_ids: ids.length > 0 ? ids : undefined,
        // TODO: expose a dry_run toggle once the kernel honors `dry_run: false`.
        // Today the runner forces dry_run=true server-side regardless.
        dry_run: true,
      });
      setActiveRunId(response.eval_run_id);
    } catch (err) {
      const msg =
        (err as { message?: string } | undefined)?.message ??
        (err instanceof Error ? err.message : 'Run failed');
      setRunError(msg);
    }
  };

  const isRunning = runMut.isPending;
  const runButtonLabel = (() => {
    if (isRunning) return 'Running…';
    if (selectedCaseIds.length === 0) return `Run All (${cases.length})`;
    return `Run Selected (${selectedCaseIds.length})`;
  })();

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold text-[#1a1a1a]">Agent Evals</h2>
          <p className="text-[12px] text-[#6b6b6b] mt-0.5">
            Run golden test cases against this agent in dry-run mode. Both
            cases and run history are persisted server-side.
          </p>
        </div>

        <button
          type="button"
          onClick={() => runEvals()}
          disabled={isRunning || cases.length === 0}
          className={cn(
            'inline-flex items-center gap-2 h-[36px] px-[14px] rounded-[8px] text-white text-[12px] font-semibold',
            'bg-[#1976d2] hover:bg-[#1565c0]',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {runButtonLabel}
        </button>
      </header>

      {runError && (
        <div
          role="alert"
          className="rounded-[8px] bg-[#fdecea] border border-[#f5c2c0] px-[12px] py-[10px] text-[12px] text-[#c0392b]"
        >
          {runError}
        </div>
      )}

      {/* Active run summary (latest selected run) */}
      {activeRun && (
        <section className="rounded-[14px] border border-[#ece9e3] bg-white px-[16px] py-[14px]">
          <SummaryAdapter run={activeRun} />
        </section>
      )}

      {/* Case list */}
      <EvalCaseList
        agentId={agentId}
        selected={selectedCaseIds}
        onSelectionChange={setSelectedCaseIds}
        onCreateClick={() => setCreateOpen(true)}
        lastRun={activeRun}
      />

      {/* Recent runs (persisted) */}
      <EvalRunsTable
        runs={persistedRuns}
        selectedRunId={activeRunId}
        onSelectRun={setActiveRunId}
        loading={runsLoading}
      />

      {/* Active run detail */}
      {activeRun ? (
        <EvalRunDetail
          run={activeRun}
          rerunPending={isRunning}
          onRerunFailed={(ids) => runEvals(ids)}
        />
      ) : persistedRuns.length === 0 && !runsLoading ? (
        <section className="rounded-[14px] border border-dashed border-[#ece9e3] bg-white py-[28px] text-center">
          <FlaskConical size={20} className="mx-auto text-[#bfbcb6]" />
          <p className="mt-2 text-[13px] text-[#1a1a1a] font-medium">
            No eval runs yet
          </p>
          <p className="text-[12px] text-[#8e8a84]">
            Select cases above (or none for all) and click run.
          </p>
        </section>
      ) : null}

      <CreateEvalCaseModal
        open={createOpen}
        agentId={agentId}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}

// Adapt EvalSummary's prop shape to the wire EvalRunResponse summary —
// EvalSummary expects pass_rate as a percent (0..100), while the wire is 0..1.
function SummaryAdapter({ run }: { run: EvalRunResponse }) {
  const summary = run.summary;
  return (
    <EvalSummary
      summary={{
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        errors: summary.errors,
        pass_rate: summary.pass_rate * 100,
        avg_score: summary.avg_score,
        avg_cost: summary.avg_cost,
        total_duration_ms: summary.total_duration_ms,
      }}
    />
  );
}
