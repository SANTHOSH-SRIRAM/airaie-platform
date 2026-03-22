import { Settings } from 'lucide-react';
import Avatar from '@components/ui/Avatar';

interface UserCardProps {
  name: string;
  role: string;
}

export default function UserCard({ name, role }: UserCardProps) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 border-t border-sidebar-border">
      <Avatar name={name} size="sm" className="bg-brand-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-sidebar-text-active truncate">{name}</p>
        <p className="text-xs text-sidebar-icon font-mono truncate">{role}</p>
      </div>
      <button className="shrink-0 w-8 h-8 flex items-center justify-center text-sidebar-icon hover:bg-sidebar-hover hover:text-sidebar-text-active transition-colors duration-100 rounded-sm">
        <Settings size={16} />
      </button>
    </div>
  );
}
