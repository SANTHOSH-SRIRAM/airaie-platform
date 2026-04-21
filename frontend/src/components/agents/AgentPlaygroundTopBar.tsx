import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { cn } from '@utils/cn';

const TABS = [
  { id: 'builder', label: 'Builder' },
  { id: 'playground', label: 'Playground' },
  { id: 'evals', label: 'Evals' },
  { id: 'runs', label: 'Runs' },
] as const;

interface AgentPlaygroundTopBarProps {
  agentName: string;
  agentVersion: string;          // e.g. "v2"
  agentVersionStatus?: string;   // e.g. "published" | "draft"
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewSession?: () => void;
  newSessionPending?: boolean;
}

export default function AgentPlaygroundTopBar({
  agentName,
  agentVersion,
  agentVersionStatus = 'published',
  activeTab,
  onTabChange,
  onNewSession,
  newSessionPending,
}: AgentPlaygroundTopBarProps) {
  const navigate = useNavigate();
  const activeSessionId = useAgentPlaygroundStore((s) => s.activeSessionId);

  return (
    <div
      data-testid="agent-playground-topbar"
      className="flex w-full max-w-[992px] mx-auto flex-wrap items-center gap-3 rounded-[18px] border border-[#ece9e3] bg-white px-[14px] py-[8px] shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]"
    >
      {/* Back arrow */}
      <button
        type="button"
        onClick={() => navigate('/agents')}
        className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[#8e8a84] transition-colors hover:bg-[#f5f3ef] hover:text-[#1a1a1a]"
        aria-label="Back to agents"
      >
        <ArrowLeft size={17} />
      </button>

      {/* Agent name + version badge */}
      <div className="min-w-0 flex items-center gap-3 pr-2">
        <h1 className="truncate text-[15px] font-semibold text-[#1a1a1a]">{agentName}</h1>
        {agentVersion && (
          <span className="inline-flex flex-col rounded-[10px] bg-[#f6e6ff] px-2 py-1 text-[11px] font-medium leading-[1.05] text-[#ad35ff]">
            <span>{agentVersion}</span>
            <span>{agentVersionStatus}</span>
          </span>
        )}
      </div>

      {/* Tab navigation — same underline style as studio */}
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
                active ? 'font-medium text-[#1a1a1a]' : 'text-[#9b978f] hover:text-[#3a3a3a]',
              )}
            >
              {tab.label}
              {active && <span className="absolute inset-x-0 bottom-0 h-px rounded-full bg-[#1a1a1a]" />}
            </button>
          );
        })}
      </nav>

      {/* Right: session selector + new session */}
      <div className="ml-auto flex items-center gap-2">
        <span
          data-testid="session-selector"
          className="h-8 px-3 flex items-center text-[11px] font-mono text-[#8f8a83] bg-[#f5f3ef] border border-[#ece9e3] rounded-[8px]"
        >
          {activeSessionId ? `Session: ${activeSessionId}` : 'No session'}
        </span>
        {onNewSession && (
          <button
            data-testid="new-session-btn"
            type="button"
            onClick={onNewSession}
            disabled={newSessionPending}
            className="h-[38px] px-4 inline-flex items-center gap-1.5 rounded-[11px] border border-[#d8b4fe] text-[14px] font-medium text-[#a855f7] hover:bg-[#faf5ff] disabled:opacity-60"
          >
            {newSessionPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Plus className="w-3.5 h-3.5" />
            }
            New Session
          </button>
        )}
      </div>
    </div>
  );
}
