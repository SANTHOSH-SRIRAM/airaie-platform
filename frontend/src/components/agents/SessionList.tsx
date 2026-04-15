import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import Badge from '@components/ui/Badge';
import { cn } from '@utils/cn';

export interface SessionListProps {
  agentId?: string;
}

export default function SessionList({ agentId: _agentId }: SessionListProps) {
  const activeSessionId = useAgentPlaygroundStore((s) => s.activeSessionId);
  const setActiveSession = useAgentPlaygroundStore((s) => s.setActiveSession);

  if (!activeSessionId) {
    return (
      <div data-testid="session-list" className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-cds-text-secondary text-center px-4">
            No active session. Navigate to the Playground tab to start one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="session-list" className="flex flex-col h-full">
      {/* Active session row */}
      <div className="flex-1 overflow-y-auto">
        <div
          data-testid="session-item"
          onClick={() => setActiveSession(activeSessionId)}
          className={cn(
            'px-3 py-3 border-b border-cds-border-subtle cursor-pointer transition-colors duration-100',
            'bg-blue-20',
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm truncate font-medium text-cds-text-primary font-mono">
              {activeSessionId}
            </span>
            <Badge variant="success" dot>
              Active
            </Badge>
          </div>
          <div className="text-xs text-cds-text-secondary">
            Current session
          </div>
        </div>
      </div>

      {/* Stats footer */}
      <div className="border-t border-cds-border-subtle p-3">
        <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-2">
          Agent Stats
        </p>
        <div className="space-y-1 text-xs text-cds-text-secondary">
          <div className="flex justify-between">
            <span>Active sessions</span>
            <span className="text-cds-text-primary">1</span>
          </div>
          <div className="flex justify-between">
            <span>Session ID</span>
            <span className="text-cds-text-primary font-mono text-[10px] truncate max-w-[120px]">
              {activeSessionId}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
