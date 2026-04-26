import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import type { GovernanceStudy } from '@/types/index';
import { useGovernance } from '@hooks/useDashboard';
import { cn } from '@utils/cn';
import ErrorState from '@components/ui/ErrorState';

const actionStyles: Record<string, string> = {
  study:   'bg-[#fff3e0] text-[#f57c00] hover:bg-[#ffe9cc]',
  explore: 'bg-[#e8f5e9] text-[#2e7d32] hover:bg-[#dceddd]',
  review:  'bg-[#fff3e0] text-[#f57c00] hover:bg-[#ffe9cc]',
};

const StudyRow = memo(function StudyRow({ study, onAction }: {
  study: GovernanceStudy;
  onAction: (boardId: string) => void;
}) {
  const progress = study.gatesTotal > 0 ? (study.gatesPassed / study.gatesTotal) * 100 : 0;

  return (
    <div className="py-3 border-b border-[#f0f0ec] last:border-b-0">
      <div className="flex items-center justify-between mb-1.5">
        <button
          className="text-[13px] font-semibold text-[#1a1a1a] truncate text-left hover:underline"
          onClick={() => onAction(study.id)}
        >
          {study.name}
        </button>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex-1 h-1.5 bg-[#f0f0ec] rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-300',
              progress === 100 ? 'bg-[#2e7d32]' : 'bg-[#f57c00]'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] text-[#949494] shrink-0">
          {study.gatesPassed}/{study.gatesTotal} gates passed
        </span>
      </div>
      {study.approvalStatus === 'pending' && (
        <p className="text-[11px] text-[#f57c00] mb-1.5">1 approval pending</p>
      )}
      <div className="flex items-center gap-1.5">
        {study.actions.map((action) => {
          const style = actionStyles[action] ?? 'bg-[#f0f0ec] text-[#6b6b6b] hover:bg-[#e8e6e1]';
          return (
            <button
              key={action}
              onClick={() => onAction(study.id)}
              className={cn(
                'h-6 px-2.5 text-[11px] font-medium capitalize rounded-md transition-colors duration-100',
                style
              )}
            >
              {action}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default function GovernanceWidget() {
  const { data: studies, isLoading, isError, refetch } = useGovernance();
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[12px] border border-[#ece9e3] shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)] p-[20px]">
      <div className="flex items-center justify-between pb-[16px]">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-[#f57c00]" />
          <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Governance</h2>
        </div>
        <button className="text-[12px] text-[#6b6b6b] hover:text-[#1a1a1a] font-medium transition-colors duration-100" onClick={() => navigate('/boards')}>View All</button>
      </div>
      {isError ? (
        <ErrorState message="Failed to load governance data" onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-[#f0f0ec] rounded" />)}
        </div>
      ) : (studies ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Shield size={20} className="text-[#cdc8bf] mb-2" />
          <p className="text-[12px] font-medium text-[#6b6b6b]">No boards need governance yet</p>
          <button
            className="mt-3 text-[12px] font-semibold text-[#f57c00] hover:underline"
            onClick={() => navigate('/boards')}
          >
            Create a board →
          </button>
        </div>
      ) : (
        <div>
          {studies!.map((study) => (
            <StudyRow
              key={study.id}
              study={study}
              onAction={(boardId) => navigate(`/boards/${boardId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
