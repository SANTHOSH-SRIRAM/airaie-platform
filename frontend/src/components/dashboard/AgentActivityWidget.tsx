import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import type { AgentActivityEntry } from '@/types/index';
import { useAgentActivity } from '@hooks/useDashboard';
import { cn } from '@utils/cn';
import ErrorState from '@components/ui/ErrorState';

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function confidenceColor(confidence: number): string {
  // green when confidently auto-approvable, orange when borderline, red when low
  if (confidence >= 0.8) return 'text-[#2e7d32]';
  if (confidence >= 0.6) return 'text-[#f57c00]';
  return 'text-[#c62828]';
}

// Alternate Configure-purple and Govern-orange to visually code the action
// type at a glance (selected-tool decisions vs escalations).
const ACTIVITY_DOT_COLORS = ['bg-[#7b1fa2]', 'bg-[#f57c00]', 'bg-[#7b1fa2]', 'bg-[#f57c00]', 'bg-[#7b1fa2]'];

const ActivityRow = memo(function ActivityRow({ entry, index }: { entry: AgentActivityEntry; index: number }) {
  const dotColor = ACTIVITY_DOT_COLORS[index % ACTIVITY_DOT_COLORS.length];

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#f0f0ec] last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('w-[6px] h-[6px] rounded-full shrink-0', dotColor)} />
        <span className="text-[13px] text-[#1a1a1a] truncate">
          <span className="font-medium">{entry.agentName}</span>
          <span className="text-[#949494]"> &rarr; {entry.action}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className={cn('text-[11px] font-mono', confidenceColor(entry.confidence))}>
          {entry.confidence.toFixed(2)}
        </span>
        <span className="text-[11px] text-[#949494]">{formatRelative(entry.timestamp)}</span>
      </div>
    </div>
  );
});

export default function AgentActivityWidget() {
  const { data: activity, isLoading, isError, refetch } = useAgentActivity();
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[12px] border border-[#ece9e3] shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)] p-[20px]">
      <div className="flex items-center justify-between pb-[16px]">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-[#7b1fa2]" />
          <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Agent Activity</h2>
        </div>
        <button className="text-[12px] text-[#6b6b6b] hover:text-[#1a1a1a] font-medium transition-colors duration-100" onClick={() => navigate('/agents')}>View All</button>
      </div>
      {isError ? (
        <ErrorState message="Failed to load agent activity" onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-[#f0f0ec] rounded" />)}
        </div>
      ) : (activity ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Bot size={20} className="text-[#cdc8bf] mb-2" />
          <p className="text-[12px] font-medium text-[#6b6b6b]">No agent decisions yet</p>
          <button
            className="mt-3 text-[12px] font-semibold text-[#7b1fa2] hover:underline"
            onClick={() => navigate('/agent-studio')}
          >
            Configure your first agent →
          </button>
        </div>
      ) : (
        <div>
          {activity!.map((entry, i) => <ActivityRow key={entry.id} entry={entry} index={i} />)}
        </div>
      )}
    </div>
  );
}
