import { MoreHorizontal } from 'lucide-react';
import Card from '@components/ui/Card';

interface WorkflowItem {
  name: string;
  status: 'success' | 'warning' | 'danger';
  detail: string;
  time: string;
}

const workflows: WorkflowItem[] = [
  {
    name: 'Chassis_Assy_Main',
    status: 'success',
    detail: 'Modified by J.Doe',
    time: '2h ago',
  },
  {
    name: 'Suspension_Linkage_R',
    status: 'warning',
    detail: 'Review Pending',
    time: '5h ago',
  },
  {
    name: 'Brake_Caliper_V2',
    status: 'danger',
    detail: 'Warning: Tolerance',
    time: '1d ago',
  },
];

const statusColor: Record<string, string> = {
  success: 'bg-status-success',
  warning: 'bg-slate-400',
  danger: 'bg-status-warning',
};

export default function RecentWorkflowsCard() {
  return (
    <Card className="flex-1">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-xs font-bold text-content-primary uppercase tracking-wider">
          Recent Workflows
        </h2>
        <button className="p-1 text-content-muted hover:text-content-secondary transition-colors">
          <MoreHorizontal size={16} />
        </button>
      </div>
      <div className="px-5 pb-5">
        <div className="space-y-0">
          {workflows.map((wf, i) => (
            <div
              key={wf.name}
              className={`flex items-start gap-3 py-3.5 ${
                i < workflows.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <span className={`w-[7px] h-[7px] rounded-sm mt-1.5 shrink-0 ${statusColor[wf.status]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-content-primary font-mono truncate">{wf.name}</p>
                <p className="text-xs text-content-tertiary mt-0.5">{wf.detail}</p>
              </div>
              <span className="text-xs text-content-muted font-mono shrink-0">{wf.time}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
