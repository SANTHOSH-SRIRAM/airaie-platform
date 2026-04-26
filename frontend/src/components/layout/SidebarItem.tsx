import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@utils/cn';

interface SidebarItemProps {
  icon?: ReactNode;
  label: string;
  path?: string;
  external?: boolean;
  bullet?: boolean;
  bulletColor?: string;
  badge?: number;
  onClick?: () => void;
  /** Smaller item height for RECENT section */
  compact?: boolean;
  /** Optional data-testid for E2E selectors. */
  testId?: string;
}

export default function SidebarItem({
  icon, label, path, external, bullet, bulletColor = 'bg-[#2196f3]', badge, onClick, compact, testId,
}: SidebarItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = path ? location.pathname === path || location.pathname.startsWith(path + '/') : false;

  const handleClick = () => {
    if (onClick) { onClick(); return; }
    if (external && path) window.open(path, '_blank');
    else if (path) navigate(path);
  };

  return (
    <button
      onClick={handleClick}
      data-testid={testId}
      className={cn(
        'w-full flex items-center rounded-[8px] transition-colors duration-100',
        compact ? 'h-[32px] px-[10px] gap-[8px]' : 'h-[36px] px-[12px] gap-[10px]',
        isActive
          ? 'bg-[#f5f5f0] font-semibold text-[#1a1a1a]'
          : 'font-normal text-[#6b6b6b] hover:bg-[#f5f5f0]'
      )}
    >
      {bullet && <span className={cn('w-[6px] h-[6px] rounded-full shrink-0', bulletColor)} />}
      {icon && (
        <span className="shrink-0 flex items-center justify-center w-[18px] h-[18px]">
          <span className={cn('[&>svg]:h-4 [&>svg]:w-4', isActive ? 'text-[#1a1a1a]' : 'text-[#949494]')}>
            {icon}
          </span>
        </span>
      )}
      <span className={cn('flex-1 text-left truncate', compact ? 'text-[11px]' : 'text-[13px]')}>
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="shrink-0 min-w-[20px] h-[18px] px-[6px] flex items-center justify-center rounded-full bg-[#f0f0ec] text-[11px] font-normal text-[#6b6b6b]">
          {badge}
        </span>
      )}
    </button>
  );
}
