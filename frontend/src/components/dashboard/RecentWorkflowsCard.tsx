import { MoreHorizontal } from 'lucide-react';
import Card from '@components/ui/Card';

const workflows = [
  { name: 'Chassis_Assy_Main', status: 'success' as const, detail: 'Modified by J.Doe', time: '2h ago' },
  { name: 'Suspension_Linkage_R', status: 'warning' as const, detail: 'Review Pending', time: '5h ago' },
  { name: 'Brake_Caliper_V2', status: 'danger' as const, detail: 'Warning: Tolerance', time: '1d ago' },
];

const statusConfig: Record<string, { dot: string; hoverBg: string }> = {
  success: { dot: 'bg-status-success', hoverBg: 'hover:bg-status-success-bg' },
  warning: { dot: 'bg-status-warning', hoverBg: 'hover:bg-status-warning-bg' },
  danger:  { dot: 'bg-status-danger',  hoverBg: 'hover:bg-status-danger-bg' },
};

export default function RecentWorkflowsCard() {
  return (
    <Card variant="elevated" className="flex-1">
      <div className="flex items-center justify-between px-5 h-12 border-b border-card-border-inner bg-card-header">
        <h2 className="text-xs font-semibold text-content-primary uppercase tracking-wider">Recent Workflows</h2>
        <button className="w-8 h-8 flex items-center justify-center text-content-placeholder hover:text-content-secondary hover:bg-surface-hover rounded-md transition-colors duration-100">
          <MoreHorizontal size={16} />
        </button>
      </div>
      <div>
        {workflows.map((wf) => {
          const cfg = statusConfig[wf.status];
          return (
            <div key={wf.name} className={`flex items-start gap-3 px-5 py-3.5 border-b border-border-subtle last:border-b-0 cursor-pointer ${cfg.hoverBg} transition-colors duration-100`}>
              <span className={`w-2 h-2 mt-[7px] rounded-full shrink-0 ${cfg.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-content-primary font-mono truncate">{wf.name}</p>
                <p className="text-xs text-content-helper mt-0.5">{wf.detail}</p>
              </div>
              <span className="text-[11px] text-content-placeholder font-mono shrink-0 mt-0.5">{wf.time}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
