import { memo, type ReactNode } from 'react';
import { Handle, Position, type HandleType as RFHandleType } from '@xyflow/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@utils/cn';

export interface HandleConfig {
  id: string;
  type: RFHandleType; // 'source' | 'target'
  position: Position;
  label?: string;
  offset?: number; // vertical offset in percent for stacked handles
  style?: React.CSSProperties;
  className?: string;
}

export interface BaseNodeProps {
  icon: LucideIcon;
  label: string;
  borderColor: string;
  iconBgColor?: string;
  iconTextColor?: string;
  selected?: boolean;
  version?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed';
  subtitle?: string;
  handles?: HandleConfig[];
  children?: ReactNode;
}

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-[#acacac]',
  running: 'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
};

function BaseNode({
  icon: Icon,
  label,
  borderColor,
  iconBgColor = 'bg-[#f7f7f5]',
  iconTextColor = 'text-[#8b8b8b]',
  selected = false,
  version,
  status,
  subtitle,
  handles = [],
  children,
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        'relative min-w-[180px] rounded-[12px] border-l-[3px] bg-white px-4 py-3',
        'shadow-[0px_2px_14px_0px_rgba(0,0,0,0.06)]',
        selected
          ? 'ring-2 ring-blue-500 ring-offset-2 shadow-[0px_8px_18px_rgba(59,130,246,0.15)]'
          : 'border border-l-[3px] border-transparent'
      )}
      style={{ borderLeftColor: borderColor }}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <div
          className={cn(
            'mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            iconBgColor
          )}
        >
          <Icon size={14} className={iconTextColor} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium text-[#1a1a1a]">
              {label}
            </span>
            {version && (
              <span className="shrink-0 rounded-full bg-[#efefef] px-1.5 py-0.5 text-[10px] text-[#8b8b8b]">
                {version}
              </span>
            )}
            {status && (
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  STATUS_COLORS[status] ?? STATUS_COLORS.idle
                )}
              />
            )}
          </div>
          {subtitle && (
            <div className="mt-0.5 truncate text-[11px] text-[#949494]">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Extra content */}
      {children && <div className="mt-2">{children}</div>}

      {/* Handles */}
      {handles.map((h) => (
        <Handle
          key={h.id}
          id={h.id}
          type={h.type}
          position={h.position}
          className={cn(
            '!h-[10px] !w-[10px] !border-2 !border-white !bg-[#2d2d2d]',
            h.className
          )}
          style={
            h.offset !== undefined
              ? { top: `${h.offset}%`, ...h.style }
              : h.style
          }
        />
      ))}
    </div>
  );
}

export default memo(BaseNode);
