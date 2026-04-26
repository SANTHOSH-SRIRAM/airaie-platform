import type { ComponentType } from 'react';
import {
  ArrowRight,
  Bot,
  GitBranch,
  LayoutGrid,
  Play,
  ShieldAlert,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardGreetingProps {
  userName: string;
  activeRunCount: number;
  pendingGateCount: number;
  agentDecisionsToday: number;
  /** True when no workflows, agents, or boards exist yet — show welcome variant. */
  isFirstTimeUser?: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Short motivator that adapts to platform state. The pills carry the numbers. */
function getSubtitle(activeRunCount: number, pendingGateCount: number, agentDecisionsToday: number): string {
  const total = activeRunCount + pendingGateCount + agentDecisionsToday;
  if (total === 0) return 'All systems operational. Pick up where you left off.';
  if (pendingGateCount > 0) return "Here's what needs your attention.";
  if (activeRunCount > 0) return 'Live execution in progress.';
  return 'Your AI co-pilots are working.';
}

/* ------------------------------------------------------------------ */
/* Status pill — coloured by journey lane: execute / govern / configure */
/* ------------------------------------------------------------------ */

interface StatusPillProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  /** execute (blue) · govern (orange) · configure (purple) · neutral (grey). */
  tone: 'execute' | 'govern' | 'configure' | 'neutral';
}

function StatusPill({ icon: Icon, label, tone }: StatusPillProps) {
  const toneClasses: Record<StatusPillProps['tone'], string> = {
    execute: 'bg-[#e3f2fd] text-[#1976d2] border-[#cfe3f7]',
    govern: 'bg-[#fff3e0] text-[#f57c00] border-[#ffe1ba]',
    configure: 'bg-[#f3e5f5] text-[#7b1fa2] border-[#e7d2eb]',
    neutral: 'bg-[#ffffffcc] text-[#2d2d2d] border-[#ece9e3]',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium ${toneClasses[tone]}`}
    >
      <Icon size={14} />
      <span>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* First-time welcome — three starter tiles                            */
/* ------------------------------------------------------------------ */

interface StarterTileProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
  accent: string;
}

function StarterTile({ icon: Icon, title, description, cta, onClick, accent }: StarterTileProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-1 flex-col items-start gap-2 rounded-[14px] border border-[#ece9e3] bg-[#ffffffcc] p-4 text-left transition-all hover:border-[#cdc8bf] hover:bg-white"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${accent}`}>
        <Icon size={16} className="text-white" />
      </span>
      <span className="text-[14px] font-semibold text-[#1a1a1a]">{title}</span>
      <span className="text-[12px] leading-[1.5] text-[#6b6b6b]">{description}</span>
      <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[#2d2d2d] group-hover:gap-1.5 transition-all">
        {cta} <ArrowRight size={13} />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */

export default function DashboardGreeting({
  userName,
  activeRunCount,
  pendingGateCount,
  agentDecisionsToday,
  isFirstTimeUser = false,
}: DashboardGreetingProps) {
  const navigate = useNavigate();

  // ---------------- First-time welcome variant ----------------
  if (isFirstTimeUser) {
    return (
      <section className="relative overflow-hidden rounded-[20px] border border-[#ece9e3] bg-[linear-gradient(135deg,#fffdfa_0%,#f8f8f7_48%,#f3edea_100%)] shadow-[0px_4px_16px_0px_rgba(26,26,26,0.05)]">
        <div className="pointer-events-none absolute right-[-80px] top-[-48px] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle_at_center,rgba(156,39,176,0.16),rgba(156,39,176,0)_70%)]" />
        <div className="pointer-events-none absolute bottom-[-90px] right-[100px] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle_at_center,rgba(33,150,243,0.12),rgba(33,150,243,0)_72%)]" />

        <div className="relative flex flex-col gap-6 px-[24px] py-[24px] sm:px-[28px] sm:py-[28px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ece9e3] bg-[#ffffffcc] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b6b6b]">
              <Sparkles size={12} className="text-[#9c27b0]" />
              Welcome to Airaie
            </div>
            <h1 className="mt-4 text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#1a1a1a] sm:text-[32px]">
              {getGreeting()}, {userName}
            </h1>
            <p className="mt-2 max-w-[640px] text-[13px] font-medium leading-[1.6] text-[#6b6b6b] sm:text-[14px]">
              Pick a starting point. You can always change tracks later.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <StarterTile
              icon={GitBranch}
              title="Try a sample workflow"
              description="Run an FEA pipeline end-to-end. Watch the DAG light up node-by-node."
              cta="Open Workflow Studio"
              accent="bg-[#1976d2]"
              onClick={() => navigate('/workflow-studio')}
            />
            <StarterTile
              icon={Bot}
              title="Configure an AI agent"
              description="Pick a goal, choose tools, set a policy. Agents propose — you stay in control."
              cta="Create agent"
              accent="bg-[#7b1fa2]"
              onClick={() => navigate('/agent-studio')}
            />
            <StarterTile
              icon={Wrench}
              title="Browse the tool catalog"
              description="See every solver, mesher, and analyzer the platform can run."
              cta="View tools"
              accent="bg-[#2d2d2d]"
              onClick={() => navigate('/tools')}
            />
          </div>
        </div>
      </section>
    );
  }

  // ---------------- Standard hero ----------------
  const subtitle = getSubtitle(activeRunCount, pendingGateCount, agentDecisionsToday);
  const showQuietPill = activeRunCount === 0 && pendingGateCount === 0 && agentDecisionsToday === 0;

  return (
    <section className="relative overflow-hidden rounded-[20px] border border-[#ece9e3] bg-[linear-gradient(135deg,#fffdfa_0%,#f8f8f7_48%,#f3edea_100%)] shadow-[0px_4px_16px_0px_rgba(26,26,26,0.05)]">
      <div className="pointer-events-none absolute right-[-80px] top-[-48px] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle_at_center,rgba(156,39,176,0.16),rgba(156,39,176,0)_70%)]" />
      <div className="pointer-events-none absolute bottom-[-90px] right-[100px] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle_at_center,rgba(33,150,243,0.12),rgba(33,150,243,0)_72%)]" />

      <div className="relative flex flex-col gap-6 px-[24px] py-[24px] sm:px-[28px] sm:py-[28px] lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[760px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ece9e3] bg-[#ffffffcc] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b6b6b]">
            <Sparkles size={12} className="text-[#9c27b0]" />
            Airaie Command Center
          </div>

          <div className="mt-4 space-y-2">
            <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#1a1a1a] sm:text-[32px]">
              {getGreeting()}, {userName}
            </h1>
            <p className="max-w-[640px] text-[13px] font-medium leading-[1.6] text-[#6b6b6b] sm:text-[14px]">
              {subtitle}
            </p>
          </div>

          {/* Three pills mapped to the journey lanes: execute / govern / configure.
              Hide each when its count is 0; show a neutral "Workspace quiet" pill
              when nothing is happening. */}
          <div className="mt-5 flex flex-wrap gap-2.5">
            {activeRunCount > 0 && (
              <StatusPill
                icon={Play}
                label={`${activeRunCount} active run${activeRunCount !== 1 ? 's' : ''}`}
                tone="execute"
              />
            )}
            {pendingGateCount > 0 && (
              <StatusPill
                icon={ShieldAlert}
                label={`${pendingGateCount} board${pendingGateCount !== 1 ? 's' : ''} for review`}
                tone="govern"
              />
            )}
            {agentDecisionsToday > 0 && (
              <StatusPill
                icon={Bot}
                label={`${agentDecisionsToday} agent decision${agentDecisionsToday !== 1 ? 's' : ''} today`}
                tone="configure"
              />
            )}
            {showQuietPill && (
              <StatusPill icon={Sparkles} label="Workspace quiet" tone="neutral" />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
          <button
            onClick={() => navigate('/workflow-studio')}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#2d2d2d] px-[18px] py-[13px] text-[13px] font-semibold text-white shadow-[0px_3px_10px_0px_rgba(45,45,45,0.12)] transition-colors duration-100 hover:bg-[#242424]"
          >
            <GitBranch size={15} />
            <span>Open Workflow Studio</span>
            <ArrowRight size={15} />
          </button>
          {pendingGateCount > 0 && (
            <button
              onClick={() => navigate('/boards')}
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#ffe1ba] bg-[#fff3e0] px-[18px] py-[13px] text-[13px] font-semibold text-[#f57c00] transition-colors duration-100 hover:bg-[#ffe9cc]"
            >
              <LayoutGrid size={15} />
              <span>
                Review Board{pendingGateCount !== 1 ? 's' : ''}
              </span>
              <ArrowRight size={15} />
            </button>
          )}
          <button
            onClick={() => navigate('/agent-studio')}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#e7d2eb] bg-[#ffffffcc] px-[18px] py-[13px] text-[13px] font-semibold text-[#7b1fa2] transition-colors duration-100 hover:bg-[#f3e5f5]"
          >
            <Bot size={15} />
            <span>New Agent</span>
          </button>
        </div>
      </div>
    </section>
  );
}
