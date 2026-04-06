import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import Badge from '@components/ui/Badge';
import Button from '@components/ui/Button';
import Tabs from '@components/ui/Tabs';
import Dropdown from '@components/ui/Dropdown';

interface AgentPlaygroundTopBarProps {
  agentName: string;
  agentVersion: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'builder', label: 'Builder' },
  { id: 'playground', label: 'Playground' },
  { id: 'evals', label: 'Evals' },
  { id: 'runs', label: 'Runs' },
];

export default function AgentPlaygroundTopBar({
  agentName,
  agentVersion,
  activeTab,
  onTabChange,
}: AgentPlaygroundTopBarProps) {
  const sessions = useAgentPlaygroundStore((s) => s.sessions);
  const activeSessionId = useAgentPlaygroundStore((s) => s.activeSessionId);
  const setActiveSession = useAgentPlaygroundStore((s) => s.setActiveSession);

  const sessionItems = sessions.map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div
      data-testid="agent-playground-topbar"
      className="flex items-center justify-between h-12 px-4 border-b border-cds-border-subtle bg-cds-layer-01 shrink-0"
    >
      {/* Left: agent name + version */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-cds-text-primary">{agentName}</span>
        <Badge variant="success">{agentVersion} published</Badge>
      </div>

      {/* Center: tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={onTabChange} />

      {/* Right: session selector + new session */}
      <div className="flex items-center gap-2">
        <Dropdown
          trigger={
            <button
              data-testid="session-selector"
              className="h-8 px-3 text-xs font-mono text-cds-text-secondary bg-cds-field-01 border border-cds-border-strong rounded hover:bg-cds-background-hover transition-colors"
            >
              {activeSession ? activeSession.id : 'No session'}
            </button>
          }
          items={sessionItems}
          onSelect={(value) => setActiveSession(value)}
          align="right"
        />
        <Button
          data-testid="new-session-btn"
          variant="primary"
          size="sm"
          onClick={() => {
            // Create session via first available session or placeholder
            const newId = `ses_${Date.now().toString(36)}`;
            setActiveSession(newId);
          }}
        >
          + New Session
        </Button>
      </div>
    </div>
  );
}
