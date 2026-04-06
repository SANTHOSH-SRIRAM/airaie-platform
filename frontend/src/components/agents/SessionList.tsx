import { useState } from 'react';
import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { useSessions } from '@hooks/useAgentPlayground';
import Badge from '@components/ui/Badge';
import Input from '@components/ui/Input';
import { cn } from '@utils/cn';

interface SessionListProps {
  agentId: string;
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SessionList({ agentId }: SessionListProps) {
  const { data: sessions } = useSessions(agentId);
  const activeSessionId = useAgentPlaygroundStore((s) => s.activeSessionId);
  const setActiveSession = useAgentPlaygroundStore((s) => s.setActiveSession);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = (sessions ?? []).filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div data-testid="session-list" className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-cds-border-subtle">
        <Input
          data-testid="session-search"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Session rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((session) => (
          <div
            key={session.id}
            data-testid="session-item"
            onClick={() => setActiveSession(session.id)}
            className={cn(
              'px-3 py-3 border-b border-cds-border-subtle cursor-pointer transition-colors duration-100',
              'hover:bg-cds-background-hover',
              session.id === activeSessionId && 'bg-blue-20',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  'text-sm truncate',
                  session.id === activeSessionId
                    ? 'font-medium text-cds-text-primary'
                    : 'text-cds-text-primary',
                )}
              >
                {session.name}
              </span>
              <Badge
                variant={session.status === 'active' ? 'success' : 'default'}
                dot
              >
                {session.status === 'active' ? 'Active' : 'Completed'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-cds-text-secondary">
              <span>{session.messageCount} msgs / {session.toolCallCount} tools</span>
              <span>{formatRelativeTime(session.updatedAt)}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-sm text-cds-text-secondary text-center">
            No sessions found.
          </p>
        )}
      </div>

      {/* Agent Stats */}
      <div className="border-t border-cds-border-subtle p-3">
        <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-2">
          Agent Stats
        </p>
        <div className="space-y-1 text-xs text-cds-text-secondary">
          <div className="flex justify-between">
            <span>Total sessions</span>
            <span className="text-cds-text-primary">{sessions?.length ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Avg confidence</span>
            <span className="text-cds-text-primary">87%</span>
          </div>
          <div className="flex justify-between">
            <span>Success rate</span>
            <span className="text-cds-text-primary">92%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
