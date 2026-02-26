import { Settings } from 'lucide-react';
import Avatar from '@components/ui/Avatar';

interface UserCardProps {
  name: string;
  role: string;
}

export default function UserCard({ name, role }: UserCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-surface-border">
      <Avatar name={name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-content-primary truncate">{name}</p>
        <p className="text-[11px] text-content-tertiary font-mono truncate">{role}</p>
      </div>
      <button className="shrink-0 p-1.5 rounded-md text-content-muted hover:bg-sidebar-hover hover:text-content-secondary transition-colors">
        <Settings size={15} />
      </button>
    </div>
  );
}
