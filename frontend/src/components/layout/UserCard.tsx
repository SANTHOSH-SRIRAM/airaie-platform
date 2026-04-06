import { Settings } from 'lucide-react';
import Avatar from '@components/ui/Avatar';

interface UserCardProps {
  name: string;
  role: string;
}

export default function UserCard({ name, role }: UserCardProps) {
  return (
    <div className="flex items-center gap-2.5 py-3 border-t border-[#e8e8e8] mt-auto">
      <Avatar name={name} size="sm" className="bg-[#2d2d2d]" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#1a1a1a] truncate">{name}</p>
        <p className="text-[11px] text-[#949494] font-mono truncate">{role}</p>
      </div>
      <button className="shrink-0 w-8 h-8 flex items-center justify-center text-[#949494] hover:bg-[#e8e8e8] hover:text-[#1a1a1a] transition-colors duration-100 rounded-md">
        <Settings size={16} />
      </button>
    </div>
  );
}
