import { memo } from 'react';

export type StatusBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface StatusBadgeProps {
  tone?: StatusBadgeTone;
  children: string;
}

const toneMap: Record<StatusBadgeTone, string> = {
  neutral: 'bg-[#e3e3df] text-[#554433]',
  success: 'bg-[#2e8c56]/18 text-[#2e8c56]',
  warning: 'bg-[#ff9800]/22 text-[#8b5000]',
  danger:  'bg-[#cc3326]/15 text-[#cc3326]',
  info:    'bg-[#1976d2]/15 text-[#1976d2]',
};

function StatusBadgeImpl({ tone = 'neutral', children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] px-[8px] py-[4px] font-mono text-[10px] uppercase tracking-wide ${toneMap[tone]}`}
    >
      {children}
    </span>
  );
}

export const StatusBadge = memo(StatusBadgeImpl);
export default StatusBadge;
