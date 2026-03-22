import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@utils/cn';

interface SidebarItemProps {
  icon?: ReactNode;
  label: string;
  path?: string;
  external?: boolean;
  bullet?: boolean;
  bulletColor?: string;
}

export default function SidebarItem({
  icon, label, path, external, bullet, bulletColor = 'bg-brand-primary',
}: SidebarItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = path ? location.pathname === path || location.pathname.startsWith(path + '/') : false;

  const handleClick = () => {
    if (external && path) window.open(path, '_blank');
    else if (path) navigate(path);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-2.5 h-9 text-sm transition-colors duration-100',
        isActive
          ? 'text-sidebar-text-active bg-sidebar-hover font-medium border-l-[3px] border-sidebar-active-border pl-[13px] pr-4'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active pl-4 pr-4'
      )}
    >
      {bullet && <span className={cn('w-[6px] h-[6px] rounded-sm shrink-0', bulletColor)} />}
      {icon && (
        <span className={cn('shrink-0 [&>svg]:h-4 [&>svg]:w-4', isActive ? 'text-sidebar-text-active' : 'text-sidebar-icon')}>
          {icon}
        </span>
      )}
      <span className="flex-1 text-left truncate">{label}</span>
      {external && <ArrowUpRight size={12} className="shrink-0 text-sidebar-section" />}
    </button>
  );
}
