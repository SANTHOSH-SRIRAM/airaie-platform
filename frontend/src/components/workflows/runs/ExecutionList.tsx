import { useMemo } from 'react';
import { cn } from '@utils/cn';
import { useRunStore } from '@store/runStore';
import { useExecutionStore } from '@store/executionStore';
import { useRunList } from '@hooks/useRuns';
import type { RunEntry, RunStatusFilter } from '@/types/run';
import ExecutionListItem from './ExecutionListItem';

const FILTER_TABS: { label: string; value: RunStatusFilter; dot?: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Success', value: 'succeeded', dot: '#20c05c' },
  { label: 'Failed', value: 'failed', dot: '#f05a4a' },
  { label: 'Running', value: 'running', dot: '#2f8cff' },
];

interface ExecutionListProps {
  workflowId: string;
}

export default function ExecutionList({ workflowId }: ExecutionListProps) {
  const statusFilter = useRunStore((s) => s.statusFilter);
  const selectedRunId = useRunStore((s) => s.selectedRunId);
  const selectRun = useRunStore((s) => s.selectRun);
  const setStatusFilter = useRunStore((s) => s.setStatusFilter);

  // SSE-active run from executionStore
  const activeRunId = useExecutionStore((s) => s.activeRunId);
  const executionRunStatus = useExecutionStore((s) => s.runStatus);
  const sseConnected = useExecutionStore((s) => s.sseConnected);

  const { data: runs, isLoading } = useRunList(workflowId);

  // Merge the active SSE run into the list if not already present
  const mergedRuns = useMemo(() => {
    const list = runs ?? [];
    if (!activeRunId || list.some((r) => r.id === activeRunId)) return list;

    // Build a synthetic RunEntry for the active SSE run
    const statusMap: Record<string, RunEntry['status']> = {
      PENDING: 'running',
      RUNNING: 'running',
      SUCCEEDED: 'succeeded',
      FAILED: 'failed',
      CANCELED: 'cancelled',
    };
    const syntheticEntry: RunEntry = {
      id: activeRunId,
      workflowId,
      workflowName: '',
      status: statusMap[executionRunStatus] ?? 'running',
      startedAt: new Date().toISOString(),
      duration: 0,
      nodesCompleted: 0,
      nodesTotal: 0,
      costUsd: 0,
      triggeredBy: 'Manual',
    };
    return [syntheticEntry, ...list];
  }, [runs, activeRunId, executionRunStatus, workflowId]);

  const filteredRuns = mergedRuns
    .filter((run) => statusFilter === 'all' || run.status === statusFilter)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#f0ede8] px-4 pb-3 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[#1a1a1a]">Executions</h3>
          <span className="text-[12px] text-[#b2aea8]">{filteredRuns.length} runs</span>
        </div>

        <div className="flex items-center gap-5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'inline-flex items-center gap-2 text-[12px] font-medium transition-colors',
                statusFilter === tab.value
                  ? tab.value === 'all'
                    ? 'rounded-[8px] bg-[#242424] px-3 py-1.5 text-white'
                    : 'text-[#6b6b6b]'
                  : 'text-[#6b6b6b] hover:text-[#1a1a1a]'
              )}
            >
              {tab.dot ? <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: tab.dot }} /> : null}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-16 animate-pulse rounded bg-[#f2f0ec]" />
            ))}
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <p className="text-sm text-[#6b6b6b]">No runs found</p>
            <p className="mt-1 text-[11px] text-[#949494]">
              {statusFilter !== 'all'
                ? `No ${statusFilter} runs for this workflow.`
                : 'Run the workflow to see executions here.'}
            </p>
          </div>
        ) : (
          filteredRuns.map((run) => (
            <ExecutionListItem
              key={run.id}
              run={run}
              isSelected={run.id === selectedRunId}
              isLive={run.id === activeRunId && sseConnected}
              onClick={() => selectRun(run.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
