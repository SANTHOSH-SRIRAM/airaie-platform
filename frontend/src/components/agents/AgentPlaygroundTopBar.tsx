import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { cn } from '@utils/cn';

interface AgentPlaygroundTopBarProps {
  agentName: string;
  agentVersion: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewSession?: () => void;
  newSessionPending?: boolean;
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
  onNewSession,
  newSessionPending,
}: AgentPlaygroundTopBarProps) {
  const navigate = useNavigate();
  const activeSessionId = useAgentPlaygroundStore((s) => s.activeSessionId);

  // Parse version label like "v1" and status like "published" for two-line badge
  const versionLabel = agentVersion || 'draft';
  const versionStatus = agentVersion ? 'published' : '';

  return (
    <div data-testid="agent-playground-topbar" className="flex justify-center">
      <div className="flex w-full max-w-[992px] flex-wrap items-center gap-3 rounded-[18px] border border-[#ece9e3] bg-white px-[14px] py-[8px] shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/agents')}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[#8e8a84] transition-colors hover:bg-[#f5f3ef] hover:text-[#1a1a1a]"
          aria-label="Back to agents"
        >
          <ArrowLeft size={17} />
        </button>

        {/* Agent name + version chip */}
        <div className="min-w-0 flex items-center gap-3 pr-2">
          <h1 className="truncate text-[15px] font-semibold text-[#1a1a1a]">
            {agentName}
          </h1>
          <span className="inline-flex flex-col rounded-[10px] bg-[#f6e6ff] px-2 py-1 text-[11px] font-medium leading-[1.05] text-[#ad35ff]">
            <span>{versionLabel}</span>
            {versionStatus && <span>{versionStatus}</span>}
          </span>
        </div>

        {/* Tabs */}
        <nav className="order-3 flex min-w-0 flex-1 items-center justify-start gap-6 pl-0 text-[14px] lg:order-none lg:ml-5 lg:flex-none lg:pl-4">
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'relative pb-1 text-[14px] transition-colors',
                  active ? 'font-medium text-[#1a1a1a]' : 'text-[#9b978f] hover:text-[#3a3a3a]'
                )}
              >
                {tab.label}
                {active && <span className="absolute inset-x-0 bottom-0 h-px rounded-full bg-[#1a1a1a]" />}
              </button>
            );
          })}
        </nav>

        {/* Right: session info + new session + avatar */}
        <div className="ml-auto flex items-center gap-2">
          {activeSessionId && (
            <span
              data-testid="session-selector"
              className="inline-flex h-[34px] items-center rounded-[10px] border border-[#ece9e3] bg-[#f9f7f3] px-3 text-[12px] font-mono text-[#6b6b6b]"
              title={activeSessionId}
            >
              {activeSessionId}
            </span>
          )}

          {onNewSession && (
            <button
              type="button"
              onClick={onNewSession}
              disabled={newSessionPending}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border border-[#d87aff] bg-white px-3 text-[13px] font-medium text-[#8b2bc7] transition-colors hover:bg-[#fcf5ff] disabled:opacity-50"
            >
              {newSessionPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Plus size={13} />
              )}
              New Session
            </button>
          )}

          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#2d2d2d] text-[13px] font-semibold text-white">
            S
          </div>
        </div>
      </div>
    </div>
  );
}
