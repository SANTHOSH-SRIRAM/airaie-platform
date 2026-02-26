import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
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
  icon,
  label,
  path,
  external,
  bullet,
  bulletColor = 'bg-brand-secondary',
}: SidebarItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = path
    ? location.pathname === path || location.pathname.startsWith(path + '/')
    : false;

  const handleClick = () => {
    if (external && path) {
      window.open(path, '_blank');
    } else if (path) {
      navigate(path);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-3 py-2 text-[13px] transition-colors duration-150',
        isActive
          ? 'text-brand-secondary font-semibold border-l-[3px] border-brand-secondary pl-[13px] pr-3'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-content-primary pl-4 pr-3'
      )}
    >
      {bullet && (
        <span className={cn('w-[6px] h-[6px] rounded-[1px] shrink-0', bulletColor)} />
      )}
      {icon && (
        <span
          className={cn(
            'shrink-0 w-[18px] h-[18px]',
            isActive ? 'text-brand-secondary' : 'text-sidebar-section-header'
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 text-left truncate">{label}</span>
      {external && (
        <ExternalLink size={13} className="shrink-0 text-sidebar-section-header" />
      )}
    </button>
  );
}
