import { useState, useRef, useEffect, useCallback } from 'react';
// useNavigate removed (unused)
import {
  Bell,
  Shield,
  XCircle,
  Brain,
  Settings,
  Play,
  ArrowRight,
  Globe
} from 'lucide-react';
import { cn } from '@utils/cn';

// ---------------------------------------------------------------------------
// Types & Mock Data
// ---------------------------------------------------------------------------

type NotificationCategory = 'runs' | 'approvals' | 'agents' | 'system';

interface Notification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  contextIcon: typeof Play | typeof Shield | typeof Globe;
  contextText: string;
  actions?: {
    label: string;
    type: 'primary' | 'secondary' | 'text';
    color?: string;
  }[];
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_1',
    category: 'runs',
    title: 'Run Failed — FEA Solver error',
    description: 'run_a1b0e5 failed at FEA Solver node with convergence error. 3/5 nodes completed before failure.',
    timestamp: '2m ago',
    read: false,
    contextIcon: Play,
    contextText: 'FEA Validation Pipeline · v3',
  },
  {
    id: 'notif_2',
    category: 'approvals',
    title: 'Approval Required — Thermal Evidence Gate',
    description: 'Your sign-off is needed as lead_engineer. 1 of 3 requirements met. CFD results pending.',
    timestamp: '15m ago',
    read: false,
    contextIcon: Shield,
    contextText: 'Structural Validation Study · Study mode',
    actions: [
      { label: 'Approve', type: 'primary', color: 'bg-[#4caf50]' },
      { label: 'Review', type: 'text', color: 'text-[#ff9800]' },
    ],
  },
  {
    id: 'notif_3',
    category: 'agents',
    title: 'Agent Escalated — Low confidence decision',
    description: 'FEA Optimizer Agent proposed fea-solver with confidence 0.42 (below 0.85 threshold). Material uncertainty detected.',
    timestamp: '1h ago',
    read: false,
    contextIcon: Globe,
    contextText: 'FEA Optimizer Agent · Session ses_x7k2m',
    actions: [
      { label: 'Review Proposal', type: 'text', color: 'text-[#9c27b0]' },
    ],
  },
  {
    id: 'notif_4',
    category: 'runs',
    title: 'Run Succeeded — FEA Validation Pipeline',
    description: 'All 5 nodes completed successfully in 2m 14s. Artifacts generated and saved to registry.',
    timestamp: '4h ago',
    read: true,
    contextIcon: Play,
    contextText: 'FEA Validation Pipeline · v3',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCategoryStyles(category: NotificationCategory) {
  switch (category) {
    case 'runs':
      // From the image, run failure is red
      return { border: 'border-[#e74c3c]', icon: XCircle, iconColor: 'text-[#e74c3c]', iconBg: 'bg-[#ffebee]' };
    case 'approvals':
      return { border: 'border-[#ff9800]', icon: Shield, iconColor: 'text-[#ff9800]', iconBg: 'bg-[#fff3e0]' };
    case 'agents':
      return { border: 'border-[#9c27b0]', icon: Brain, iconColor: 'text-[#9c27b0]', iconBg: 'bg-[#f3e5f5]' };
    default:
      return { border: 'border-[#acacac]', icon: Bell, iconColor: 'text-[#6b6b6b]', iconBg: 'bg-[#f0f0ec]' };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'Runs' | 'Approvals' | 'Agents' | 'System'>('All');
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative w-[32px] h-[32px] flex items-center justify-center text-[#1a1a1a] hover:bg-[#f5f5f0] rounded-full transition-colors shrink-0"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-[2px] right-[2px] min-w-[16px] h-[16px] flex items-center justify-center bg-[#e74c3c] text-white text-[10px] font-bold rounded-full border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-[400px] bg-white rounded-[12px] shadow-[0px_8px_32px_rgba(0,0,0,0.12)] border border-[#ece9e3] overflow-hidden z-[100] flex flex-col max-h-[580px]">
          
          {/* Header Area */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[#1a1a1a]" strokeWidth={2.5} />
                <h3 className="text-[14px] font-bold text-[#1a1a1a]">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="h-[20px] px-2 flex items-center justify-center bg-[#ffebee] text-[#e74c3c] text-[10px] font-bold rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#6b6b6b] font-medium">
                <button
                  onClick={handleMarkAllRead}
                  className="hover:text-[#1a1a1a] transition-colors"
                >
                  Mark all read
                </button>
                <button className="flex items-center gap-1 hover:text-[#1a1a1a] transition-colors">
                  <Settings size={12} /> Settings
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-3 border-b border-[#f0f0ec] pb-2">
              {(['All', 'Runs', 'Approvals', 'Agents', 'System'] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors',
                      isActive
                        ? 'bg-[#2d2d2d] text-white'
                        : 'text-[#6b6b6b] hover:bg-[#f5f5f0]'
                    )}
                  >
                    {tab === 'Runs' && <Play size={11} className={isActive ? 'text-[#d5d5cf]' : 'text-[#acacac]'} />}
                    {tab === 'Approvals' && <Shield size={11} className={isActive ? 'text-[#d5d5cf]' : 'text-[#ff9800]'} />}
                    {tab === 'Agents' && <Brain size={11} className={isActive ? 'text-[#d5d5cf]' : 'text-[#9c27b0]'} />}
                    {tab === 'System' && <Settings size={11} className={isActive ? 'text-[#d5d5cf]' : 'text-[#acacac]'} />}
                    
                    {tab}
                    
                    {/* Tiny notification indicator dot on specific tabs */}
                    {tab === 'Approvals' && !isActive && (
                      <span className="w-1.5 h-1.5 bg-[#ff9800] rounded-full ml-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto">
            {notifications.map((notif) => {
              const styles = getCategoryStyles(notif.category);
              const Icon = styles.icon;

              return (
                <div
                  key={notif.id}
                  className={cn(
                    'group relative border-b border-[#f0f0ec] bg-white hover:bg-[#fbfaf9] transition-colors',
                    notif.read ? 'opacity-70' : ''
                  )}
                >
                  {/* Left Color Bar */}
                  <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', styles.border)} />

                  <div className="flex items-start gap-3 p-4 pl-5">
                    {/* Icon */}
                    <div className={cn('w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 border border-white shadow-sm ring-1 ring-black/5', styles.iconBg, styles.iconColor)}>
                      <Icon size={16} strokeWidth={2} />
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mt-0.5">
                        <h4 className={cn('text-[13px] font-bold leading-tight', notif.read ? 'text-[#6b6b6b]' : 'text-[#1a1a1a]')}>
                          {notif.title}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] text-[#acacac] whitespace-nowrap">{notif.timestamp}</span>
                          {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-[#e74c3c]" />}
                        </div>
                      </div>

                      <p className="text-[12px] text-[#6b6b6b] mt-1.5 leading-relaxed pr-2">
                        {notif.description}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-[#acacac] font-medium">
                        <notif.contextIcon size={10} className="shrink-0" />
                        <span>{notif.contextText}</span>
                      </div>

                      {/* Optional Action Buttons */}
                      {notif.actions && notif.actions.length > 0 && (
                        <div className="flex items-center gap-2.5 mt-3">
                          {notif.actions.map((act, i) => (
                            <button
                              key={i}
                              className={cn(
                                'text-[11px] font-bold transition-opacity hover:opacity-80 flex items-center gap-1',
                                act.type === 'primary' 
                                  ? `${act.color} text-white px-2.5 py-1 rounded-[4px]` 
                                  : `${act.color}`
                              )}
                            >
                              {act.label}
                              {act.type === 'text' && <ArrowRight size={12} className="ml-0.5" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 p-3 bg-[#fbfaf9] border-t border-[#ece9e3] flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.02)] relative z-10">
            <span className="text-[11px] text-[#acacac] font-medium">
              Showing 10 of 23 notifications
            </span>
            <div className="flex items-center gap-3">
              <button className="text-[11px] text-[#2196f3] font-bold flex items-center gap-1 hover:underline">
                View All Notifications <ArrowRight size={12} />
              </button>
              <button className="text-[11px] text-[#6b6b6b] font-medium flex items-center gap-1 hover:text-[#1a1a1a] transition-colors">
                <Settings size={12} /> Notification Preferences
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
