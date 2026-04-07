import { CheckCircle2, XCircle, Clock, Ban, Loader2 } from 'lucide-react';
import { cn } from '@utils/cn';
import type { RunStatus, RunNodeStatus } from '@/types/run';

const statusConfig: Record<RunStatus, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  running: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: <Loader2 size={12} className="animate-spin" />,
    label: 'Running',
  },
  succeeded: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: <CheckCircle2 size={12} />,
    label: 'Succeeded',
  },
  failed: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: <XCircle size={12} />,
    label: 'Failed',
  },
  waiting: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: <Clock size={12} />,
    label: 'Waiting',
  },
  cancelled: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    icon: <Ban size={12} />,
    label: 'Cancelled',
  },
};

const nodeStatusMap: Record<RunNodeStatus, RunStatus> = {
  running: 'running',
  completed: 'succeeded',
  failed: 'failed',
  pending: 'waiting',
  skipped: 'cancelled',
};

interface RunStatusBadgeProps {
  status: RunStatus | RunNodeStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export default function RunStatusBadge({ status, size = 'md', className }: RunStatusBadgeProps) {
  // Normalize node statuses to run statuses for display
  const resolvedStatus: RunStatus =
    status in statusConfig
      ? (status as RunStatus)
      : nodeStatusMap[status as RunNodeStatus] ?? 'waiting';

  const config = statusConfig[resolvedStatus];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-normal',
        config.bg,
        config.text,
        size === 'sm' ? 'px-1.5 h-5 text-[10px]' : 'px-2 h-6 text-xs',
        className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
