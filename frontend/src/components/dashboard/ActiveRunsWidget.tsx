import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CircleDot } from 'lucide-react';
import type { ActiveRun } from '@/types/index';
import { useActiveRuns } from '@hooks/useDashboard';
import { cn } from '@utils/cn';
import ErrorState from '@components/ui/ErrorState';

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s elapsed`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s elapsed` : `${m}m elapsed`;
}

const RunRow = memo(function RunRow({ run, onClick }: { run: ActiveRun; onClick?: () => void }) {
  const progress = run.nodesTotal > 0 ? (run.nodesCompleted / run.nodesTotal) * 100 : 0;
  const isWaiting = run.status === 'waiting';

  return (
    <div className="py-3 border-b border-[#f0f0ec] last:border-b-0 cursor-pointer hover:bg-[#f8f8f7] transition-colors duration-100 rounded" onClick={onClick}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <CircleDot size={14} className={cn('shrink-0', isWaiting ? 'text-[#f57c00]' : 'text-[#1976d2]')} />
          <span className="text-[13px] font-semibold text-[#1a1a1a] truncate">{run.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {!isWaiting && (
            <div className="w-[80px] h-[4px] bg-[#e8e8e8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1976d2] rounded-full transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <span className="text-[13px] font-mono text-[#2e7d32]">${run.costUsd.toFixed(2)}</span>
        </div>
      </div>
      <div className={cn('flex items-center justify-between', isWaiting ? 'text-[#f57c00]' : 'text-[#949494]')}>
        <span className="text-[11px] font-medium">{run.runId} &middot; {isWaiting ? 'Waiting at Approval Gate' : `${run.nodesCompleted}/${run.nodesTotal} nodes \u00B7 ${formatElapsed(run.elapsedSeconds)}`}</span>
        {isWaiting && (
          <span className="ml-2 bg-[#fff3e0] text-[#f57c00] text-[11px] font-medium px-[8px] py-[4px] rounded-[6px]">
            Needs review
          </span>
        )}
      </div>
    </div>
  );
});

export default function ActiveRunsWidget() {
  const { data: runs, isLoading, isError, refetch } = useActiveRuns();
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[12px] border border-[#ece9e3] shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)] p-[20px]">
      <div className="flex items-center justify-between pb-[16px]">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[#1976d2]" />
          <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Active Runs</h2>
        </div>
        <button className="text-[12px] text-[#6b6b6b] hover:text-[#1a1a1a] font-medium transition-colors duration-100" onClick={() => navigate('/workflow-runs')}>
          View All <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
      {isError ? (
        <ErrorState message="Failed to load active runs" onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-[#f0f0ec] rounded" />)}
        </div>
      ) : (runs ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Activity size={20} className="text-[#cdc8bf] mb-2" />
          <p className="text-[12px] font-medium text-[#6b6b6b]">No runs in flight right now</p>
          <button
            className="mt-3 text-[12px] font-semibold text-[#1976d2] hover:underline"
            onClick={() => navigate('/workflow-studio')}
          >
            Start a workflow →
          </button>
        </div>
      ) : (
        <div>
          {runs!.map((run) => <RunRow key={run.id} run={run} onClick={() => navigate(`/workflow-runs/${run.runId}`)} />)}
          <p className="text-[11px] text-[#949494] mt-3">
            {runs!.filter((r) => r.status === 'running').length} active &middot; ${runs!.reduce((sum, r) => sum + r.costUsd, 0).toFixed(2)} current spend
          </p>
        </div>
      )}
    </div>
  );
}
