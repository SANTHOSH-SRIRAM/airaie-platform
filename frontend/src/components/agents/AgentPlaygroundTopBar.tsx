import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import Badge from '@components/ui/Badge';
import Tabs from '@components/ui/Tabs';

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
  const activeSessionId = useAgentPlaygroundStore((s) => s.activeSessionId);

  return (
    <div
      data-testid="agent-playground-topbar"
      className="flex items-center justify-between h-12 px-4 border-b border-cds-border-subtle bg-cds-layer-01 shrink-0"
    >
      {/* Left: agent name + version */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-cds-text-primary">{agentName}</span>
        {agentVersion && <Badge variant="success">{agentVersion} published</Badge>}
      </div>

      {/* Center: tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={onTabChange} />

      {/* Right: active session ID display */}
      <div className="flex items-center gap-2">
        <span
          data-testid="session-selector"
          className="h-8 px-3 flex items-center text-xs font-mono text-cds-text-secondary bg-cds-field-01 border border-cds-border-strong rounded"
        >
          {activeSessionId ?? 'No session'}
        </span>
      </div>
    </div>
  );
}
