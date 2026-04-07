import { User, Activity, Key, MonitorPlay, PieChart, Bell, Settings, AlertTriangle, Plus, Users } from 'lucide-react';
import { cn } from '@utils/cn';
import { useUiStore } from '@store/uiStore';

export default function ProfileSidebar() {
  const activeSection = useUiStore((s) => s.activeProfileSection);
  const setActiveSection = useUiStore((s) => s.setActiveProfileSection);

  const navItems = [
    { id: 'overview', label: 'Profile Overview', icon: User },
    { id: 'activity', label: 'Recent Activity', icon: Activity },
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'sessions', label: 'Active Sessions', icon: MonitorPlay },
    { id: 'usage', label: 'Usage & Quotas', icon: PieChart },
    { id: 'notifications', label: 'Notification Preferences', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, danger: true },
  ];

  const tools = [
    { id: 'new-key', label: 'Create New API Key', icon: Plus },
    { id: 'team', label: 'My Team Access', icon: Users },
  ];

  return (
    <aside className="flex flex-col h-full bg-white">
      <p className="text-[9px] font-semibold tracking-[0.1em] text-[#acacac] uppercase px-2 mb-2">Profile Navigation</p>
      <p className="text-[10px] text-[#6b6b6b] px-2 mb-4 leading-tight">View or adjust settings for this user.</p>

      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSection(item.id)}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-[12px] text-left transition-colors border',
              activeSection === item.id
                ? 'bg-[#f8f8f7] border-[#ece9e3] text-[#1a1a1a] font-bold shadow-sm'
                : 'border-transparent text-[#2d2d2d] hover:bg-[#f5f5f0]',
              item.danger && activeSection !== item.id && 'text-[#e74c3c] hover:bg-[#ffebee]'
            )}
          >
            <item.icon size={14} className={cn(
              activeSection === item.id ? 'text-[#1a1a1a]' : 'text-[#6b6b6b]',
              item.danger && 'text-[#e74c3c]'
            )} />
            <span className={cn(item.danger && 'text-[#e74c3c]')}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-8 px-2 flex flex-col gap-0.5">
        <p className="text-[9px] font-semibold tracking-[0.1em] text-[#acacac] uppercase mb-1">Fast Tools</p>
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium text-left transition-colors text-[#6b6b6b] hover:bg-[#f0f0ec] hover:text-[#1a1a1a]"
          >
            <t.icon size={13} className="text-[#949494]" strokeWidth={2.5} />
            {t.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
