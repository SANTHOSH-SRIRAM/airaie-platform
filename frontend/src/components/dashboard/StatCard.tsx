import { type ReactNode } from 'react';
import { cn } from '@utils/cn';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  subtitle: string;
  showDot?: boolean;
  accentColor?: 'blue' | 'green' | 'purple' | 'teal' | 'orange';
}

// Journey-lane palette — keeps StatCards visually consistent with hero pills
// (Execute=blue, Govern=orange, Configure=purple) and the sidebar groups.
const iconColors = {
  blue: 'text-[#1976d2]',
  green: 'text-[#2e7d32]',
  purple: 'text-[#7b1fa2]',
  teal: 'text-[#00796b]',
  orange: 'text-[#f57c00]',
};

const subtitleColors = {
  blue: 'text-[#1976d2]',
  green: 'text-[#2e7d32]',
  purple: 'text-[#7b1fa2]',
  teal: 'text-[#00796b]',
  orange: 'text-[#f57c00]',
};

const dotColors = {
  blue: 'bg-[#1976d2]',
  green: 'bg-[#2e7d32]',
  purple: 'bg-[#7b1fa2]',
  teal: 'bg-[#00796b]',
  orange: 'bg-[#f57c00]',
};

export default function StatCard({ icon, label, value, subtitle, showDot = false, accentColor = 'blue' }: StatCardProps) {
  return (
    <div className="bg-white rounded-[12px] border border-[#ece9e3] shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)] h-[88px] relative flex-1 min-w-0">
      {/* Icon */}
      <div className={cn('absolute left-[16px] top-[16px]', iconColors[accentColor])}>
        {icon}
      </div>
      {/* Number */}
      <span className="absolute left-[16px] top-[34px] text-[28px] font-bold text-[#1a1a1a] leading-none">
        {value}
      </span>
      {/* Label */}
      <span className="absolute left-[16px] top-[48px] text-[11px] font-medium text-[#6b6b6b]" style={{ left: `${16 + String(value).length * 18 + 5}px` }}>
        {label}
      </span>
      {/* Subtitle */}
      <div className={cn('absolute left-[16px] bottom-[10px] flex items-center gap-[2.5px] text-[10px] font-medium', subtitleColors[accentColor])}>
        {showDot && (
          <span className={cn('w-[6px] h-[6px] rounded-full inline-block', dotColors[accentColor])} />
        )}
        <span>{subtitle}</span>
      </div>
    </div>
  );
}
