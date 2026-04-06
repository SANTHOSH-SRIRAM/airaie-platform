import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Brain,
} from 'lucide-react';
import { cn } from '@utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType = 'gate_approval' | 'run_completed' | 'run_failed' | 'agent_escalation';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  route: string;
}

const NOTIFICATION_CONFIG: Record<
  NotificationType,
  { icon: typeof Bell; color: string; bgColor: string }
> = {
  gate_approval: { icon: Shield, color: 'text-[#ff9800]', bgColor: 'bg-[#fff3e0]' },
  run_completed: { icon: CheckCircle2, color: 'text-[#4caf50]', bgColor: 'bg-[#e8f5e9]' },
  run_failed: { icon: XCircle, color: 'text-[#e74c3c]', bgColor: 'bg-[#ffebee]' },
  agent_escalation: { icon: Brain, color: 'text-[#9c27b0]', bgColor: 'bg-[#f3e5f5]' },
};

// ---------------------------------------------------------------------------
// Mock notifications
// ---------------------------------------------------------------------------

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_1',
    type: 'gate_approval',
    title: 'Gate Approval Required',
    description: 'Thermal Evidence gate on Structural Validation Study needs your approval',
    timestamp: '2 minutes ago',
    read: false,
    route: '/boards/board_structural_001',
  },
  {
    id: 'notif_2',
    type: 'run_completed',
    title: 'Run Completed',
    description: 'FEA Validation Pipeline run #run_001 completed successfully',
    timestamp: '15 minutes ago',
    read: false,
    route: '/workflow-runs/run_001',
  },
  {
    id: 'notif_3',
    type: 'run_failed',
    title: 'Run Failed',
    description: 'Thermal Stress Coupling run #run_003 failed at node 4',
    timestamp: '1 hour ago',
    read: false,
    route: '/workflow-runs/run_003',
  },
  {
    id: 'notif_4',
    type: 'agent_escalation',
    title: 'Agent Escalation',
    description: 'FEA Optimizer Agent escalated decision: confidence below threshold (0.42)',
    timestamp: '2 hours ago',
    read: true,
    route: '/agent-studio/fea-optimizer',
  },
  {
    id: 'notif_5',
    type: 'run_completed',
    title: 'Run Completed',
    description: 'Mesh Quality Check run #run_005 completed in 12s',
    timestamp: '3 hours ago',
    read: true,
    route: '/workflow-runs/run_005',
  },
  {
    id: 'notif_6',
    type: 'gate_approval',
    title: 'Gate Waived',
    description: 'Release Approval gate on Bracket v2 Release was waived by admin',
    timestamp: '5 hours ago',
    read: true,
    route: '/boards/board_release_003',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on click outside
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

  // Close on Escape
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

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setIsOpen(false);
      navigate(notification.route);
    },
    [navigate]
  );

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative w-[32px] h-[32px] flex items-center justify-center text-[#949494] hover:bg-[#f5f5f0] rounded-full transition-colors shrink-0"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-[3px] right-[4px] min-w-[14px] h-[14px] flex items-center justify-center bg-[#e74c3c] text-white text-[9px] font-bold rounded-full px-[3px]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-[12px] shadow-[0px_12px_40px_rgba(0,0,0,0.15)] border border-[#ece9e3] overflow-hidden z-[100]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0ec]">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="h-[20px] min-w-[20px] flex items-center justify-center bg-[#e74c3c] text-white text-[10px] font-bold rounded-full px-1.5">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[12px] text-[#2196f3] hover:text-[#1976d2] font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => {
              const config = NOTIFICATION_CONFIG[notification.type];
              const Icon = config.icon;

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-[#f8f8f7] last:border-b-0',
                    notification.read
                      ? 'hover:bg-[#fafaf8]'
                      : 'bg-[#fafaf8] hover:bg-[#f5f5f0]'
                  )}
                >
                  <div
                    className={cn(
                      'w-[32px] h-[32px] rounded-[8px] flex items-center justify-center shrink-0 mt-0.5',
                      config.bgColor
                    )}
                  >
                    <Icon size={14} className={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-[12px] font-medium truncate',
                          notification.read ? 'text-[#6b6b6b]' : 'text-[#1a1a1a]'
                        )}
                      >
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="w-[6px] h-[6px] rounded-full bg-[#2196f3] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#949494] mt-0.5 line-clamp-2">
                      {notification.description}
                    </p>
                    <span className="text-[10px] text-[#acacac] mt-1 block">
                      {notification.timestamp}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[#f0f0ec] text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                // Future: navigate to full notification page
              }}
              className="text-[12px] text-[#6b6b6b] hover:text-[#1a1a1a] font-medium transition-colors"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
