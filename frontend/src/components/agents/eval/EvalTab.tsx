import { useState, useCallback } from 'react';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RotateCcw, FlaskConical, Filter, Download } from 'lucide-react';
import Badge from '@components/ui/Badge';
import Button from '@components/ui/Button';
import { useAgentEvalCases, useRunAgentEvals } from '@hooks/useAgentEvals';
import type { EvalRunResult } from '@api/agentEvals';
import { cn } from '@utils/cn';

/* ---------- Types ---------- */

interface EvalRowState {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'pass' | 'fail' | 'error';
  score: number | null;
  cost: number | null;
  duration_ms: number | null;
  tools_used: string[];
}

interface EvalTabProps {
  agentId: string;
  sessionId: string | null;
}

/* ---------- Status config ---------- */

const statusConfig = {
  pending: { icon: null, badgeVariant: 'default' as const, label: 'Pending' },
  running: { icon: Loader2, badgeVariant: 'info' as const, label: 'Running' },
  pass: { icon: CheckCircle, badgeVariant: 'success' as const, label: 'Pass' },
  fail: { icon: XCircle, badgeVariant: 'danger' as const, label: 'Fail' },
  error: { icon: AlertTriangle, badgeVariant: 'warning' as const, label: 'Error' },
};

/* ---------- Component ---------- */

export default function EvalTab({ agentId, sessionId }: EvalTabProps) {
  const shortSessionId = sessionId ? sessionId.slice(-8) : null;

  const { data: evalCases = [], isLoading } = useAgentEvalCases(agentId);
  const runMutation = useRunAgentEvals(agentId);

  const [rowStates, setRowStates] = useState<EvalRowState[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  // Derive display rows: use rowStates when a run is active, else use fresh eval cases.
  const displayRows: EvalRowState[] = rowStates ?? evalCases.map((ec) => ({
    id: ec.id,
    name: ec.name,
    status: 'pending',
    score: null,
    cost: null,
    duration_ms: null,
    tools_used: [],
  }));

  const runEvaluation = useCallback(async () => {
    if (!evalCases.length) return;

    // Seed all rows as pending/running immediately for responsiveness.
    const initial: EvalRowState[] = evalCases.map((ec) => ({
      id: ec.id,
      name: ec.name,
      status: 'running',
      score: null,
      cost: null,
      duration_ms: null,
      tools_used: [],
    }));
    setRowStates(initial);
    setIsRunning(true);
    setHasRun(false);

    try {
      const response = await runMutation.mutateAsync({ dry_run: true });
      // Map results back onto rows.
      const resultMap = new Map<string, EvalRunResult>();
      for (const r of response.results ?? []) {
        resultMap.set(r.eval_case_id, r);
      }
      setRowStates(initial.map((row): EvalRowState => {
        const result = resultMap.get(row.id);
        if (!result) return { ...row, status: 'pending' };
        const mapped: EvalRowState['status'] =
          result.status === 'passed' ? 'pass'
          : result.status === 'failed' ? 'fail'
          : (result.status as EvalRowState['status']);
        return {
          ...row,
          status: mapped,
          score: result.score,
          duration_ms: result.duration_ms,
        };
      }));
    } catch {
      setRowStates(initial.map((r) => ({ ...r, status: 'error' })));
    } finally {
      setIsRunning(false);
      setHasRun(true);
    }
  }, [evalCases, runMutation]);

  const resetEval = () => {
    setRowStates(null);
    setIsRunning(false);
    setHasRun(false);
  };

  const passCount = displayRows.filter((r) => r.status === 'pass').length;
  const failCount = displayRows.filter((r) => r.status === 'fail' || r.status === 'error').length;
  const runningCount = displayRows.filter((r) => r.status === 'running').length;

  let statusChipText = `${evalCases.length} cases`;
  if (isRunning) statusChipText = `${Math.max(runningCount, 1)} running`;
  else if (hasRun) statusChipText = `${passCount} pass · ${failCount} fail`;

  return (
    <div data-testid="eval-tab" className="flex flex-col h-full overflow-y-auto bg-surface-bg">
      <div className="mx-auto w-full max-w-5xl px-10 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold text-content-primary">Agent Evaluation</h1>
            <p className="text-sm text-content-secondary mt-1">
              Run test cases to evaluate agent performance · {evalCases.length} cases
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Status chips */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs',
                'bg-purple-10 text-purple-60 font-medium',
              )}
            >
              <span aria-hidden="true">•</span>
              {statusChipText}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs',
                'border border-border text-content-secondary',
              )}
            >
              <span aria-hidden="true">○</span>
              Policy ready
            </span>

            {hasRun && (
              <Button
                data-testid="eval-reset-btn"
                variant="ghost"
                size="sm"
                icon={<RotateCcw />}
                onClick={resetEval}
              >
                Reset
              </Button>
            )}
            <button
              data-testid="eval-run-btn"
              type="button"
              onClick={runEvaluation}
              disabled={isRunning || evalCases.length === 0}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium shrink-0',
                'bg-purple-50 text-white hover:bg-purple-60 transition-colors',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'shadow-[0px_2px_8px_0px_rgba(156,39,176,0.25)]',
              )}
            >
              {isRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FlaskConical className="w-3.5 h-3.5" />
              )}
              {isRunning ? 'Running...' : 'Run Evaluation'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border-subtle" />

        {/* Evaluation Cases section */}
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-content-primary">Evaluation Cases</h2>
              <p className="text-xs text-content-secondary mt-0.5">
                Core evaluation matrix
                {shortSessionId ? (
                  <>
                    {' for session '}
                    <span className="font-mono text-content-primary">{shortSessionId}</span>
                  </>
                ) : (
                  ' for this agent'
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs',
                  'border border-border text-content-primary',
                  'hover:bg-surface-hover transition-colors',
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                Filter
              </button>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs',
                  'border border-border text-content-primary',
                  'hover:bg-surface-hover transition-colors',
                )}
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div>
            {/* Table header */}
            <div
              className={cn(
                'grid grid-cols-[minmax(0,2.2fr)_7rem_6rem_6rem_minmax(0,1.4fr)] gap-4 items-center',
                'px-3 py-2',
                'text-2xs font-medium tracking-wider text-content-secondary uppercase',
                'border-b border-border-subtle',
              )}
            >
              <span>Case Name</span>
              <span>Status</span>
              <span>Score</span>
              <span>Duration</span>
              <span>Tools Used</span>
            </div>

            {/* Empty state */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-content-secondary" />
              </div>
            ) : displayRows.length === 0 ? (
              <div
                data-testid="eval-empty-state"
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <FlaskConical className="w-8 h-8 text-purple-50 mb-3 opacity-60" />
                <p className="text-sm font-medium text-content-primary">No evaluation cases defined yet.</p>
                <p className="text-xs text-content-secondary mt-1">
                  Add eval cases via the API to start benchmarking this agent.
                </p>
              </div>
            ) : (
              displayRows.map((tc) => {
                const config = statusConfig[tc.status];
                const StatusIcon = config.icon;

                return (
                  <div
                    key={tc.id}
                    data-testid="eval-test-case-row"
                    className={cn(
                      'grid grid-cols-[minmax(0,2.2fr)_7rem_6rem_6rem_minmax(0,1.4fr)] gap-4 items-center',
                      'px-3 py-4 border-b border-border-subtle',
                    )}
                  >
                    {/* Name */}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-content-primary truncate">
                        {tc.name}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center">
                      {tc.status === 'pending' ? (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            'bg-purple-10 text-purple-60',
                          )}
                        >
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          {StatusIcon && (
                            <StatusIcon
                              className={cn(
                                'w-3.5 h-3.5',
                                tc.status === 'running' && 'animate-spin text-blue-60',
                                tc.status === 'pass' && 'text-green-50',
                                tc.status === 'fail' && 'text-red-50',
                                tc.status === 'error' && 'text-yellow-30',
                              )}
                            />
                          )}
                          <Badge variant={config.badgeVariant}>{config.label}</Badge>
                        </span>
                      )}
                    </div>

                    {/* Score */}
                    <div>
                      {tc.score != null ? (
                        <span className="font-mono text-xs text-content-primary">
                          {tc.score.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-content-placeholder">—</span>
                      )}
                    </div>

                    {/* Duration */}
                    <div>
                      {tc.duration_ms != null ? (
                        <span className="font-mono text-xs text-content-primary">
                          {tc.duration_ms < 1000
                            ? `${tc.duration_ms}ms`
                            : `${(tc.duration_ms / 1000).toFixed(1)}s`}
                        </span>
                      ) : (
                        <span className="text-content-placeholder">—</span>
                      )}
                    </div>

                    {/* Tools used */}
                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                      {tc.tools_used.length === 0 ? (
                        <span className="text-content-placeholder">—</span>
                      ) : (
                        tc.tools_used.map((tool) => (
                          <Badge
                            key={tool}
                            variant="default"
                            badgeStyle="outline"
                            className="font-mono text-2xs"
                          >
                            {tool.split('@')[0]}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
