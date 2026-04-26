import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, RefreshCw } from 'lucide-react';
import type { RecentWorkflow } from '@/types/index';
import { useRecentWorkflows } from '@hooks/useDashboard';
import { cn } from '@utils/cn';
import ErrorState from '@components/ui/ErrorState';

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

const WorkflowRow = memo(function WorkflowRow({ wf, onClick }: { wf: RecentWorkflow; onClick?: () => void }) {
  const statusDot = wf.status === 'active' ? 'bg-[#4caf50]' : wf.status === 'error' ? 'bg-[#e74c3c]' : 'bg-[#acacac]';

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#f0f0ec] last:border-b-0 cursor-pointer hover:bg-[#f8f8f7] transition-colors duration-100 rounded" onClick={onClick}>
      <div className="min-w-0">
        <span className="text-[13px] font-medium text-[#1a1a1a] truncate block">{wf.name}</span>
        <span className="text-[11px] text-[#949494]">
          {wf.version} {wf.versionStatus} &middot; {wf.nodeCount} nodes
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className="text-[11px] text-[#949494]">{formatRelative(wf.updatedAt)}</span>
        <span className={cn('w-[6px] h-[6px] rounded-full shrink-0', statusDot)} />
      </div>
    </div>
  );
});

export default function RecentWorkflowsWidget() {
  const { data: workflows, isLoading, isError, refetch } = useRecentWorkflows();
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[12px] border border-[#ece9e3] shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)] p-[20px]">
      <div className="flex items-center justify-between pb-[16px]">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-[#1976d2]" />
          <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Recent Workflows</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="w-7 h-7 flex items-center justify-center text-[#949494] hover:bg-[#e8e8e8] rounded-md transition-colors duration-100"
            onClick={() => refetch()}
            aria-label="Refresh workflows"
          >
            <RefreshCw size={14} />
          </button>
          <button className="text-[12px] text-[#6b6b6b] hover:text-[#1a1a1a] font-medium transition-colors duration-100" onClick={() => navigate('/workflows')}>View All</button>
        </div>
      </div>
      {isError ? (
        <ErrorState message="Failed to load workflows" onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-[#f0f0ec] rounded" />)}
        </div>
      ) : (workflows ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <GitBranch size={20} className="text-[#cdc8bf] mb-2" />
          <p className="text-[12px] font-medium text-[#6b6b6b]">No workflows yet</p>
          <button
            className="mt-3 text-[12px] font-semibold text-[#1976d2] hover:underline"
            onClick={() => navigate('/workflow-studio')}
          >
            Create your first workflow →
          </button>
        </div>
      ) : (
        <div>
          {workflows!.map((wf) => <WorkflowRow key={wf.id} wf={wf} onClick={() => navigate(`/workflow-studio/${wf.id}`)} />)}
        </div>
      )}
    </div>
  );
}
