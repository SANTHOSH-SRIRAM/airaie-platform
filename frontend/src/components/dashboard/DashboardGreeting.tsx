import type { ComponentType } from 'react';
import { ArrowRight, Bot, GitBranch, Play, ShieldAlert, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardGreetingProps {
  userName: string;
  activeRunCount: number;
  pendingGateCount: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getOperationalSummary(activeRunCount: number, pendingGateCount: number): string {
  if (activeRunCount === 0 && pendingGateCount === 0) {
    return 'All systems nominal. You can jump back into Workflow Studio or spin up a new automation flow.';
  }

  const clauses: string[] = [];

  if (activeRunCount > 0) {
    clauses.push(
      `${activeRunCount} workflow${activeRunCount !== 1 ? 's are' : ' is'} currently running`
    );
  }

  if (pendingGateCount > 0) {
    clauses.push(
      `${pendingGateCount} approval gate${pendingGateCount !== 1 ? 's are' : ' is'} waiting for review`
    );
  }

  return `${clauses.join(' and ')}. Stay on top of live execution and governance from one place.`;
}

interface StatusPillProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  tone: 'blue' | 'orange' | 'neutral';
}

function StatusPill({ icon: Icon, label, tone }: StatusPillProps) {
  const toneClasses = {
    blue: 'bg-[#e3f2fd] text-[#1976d2] border-[#cfe3f7]',
    orange: 'bg-[#fff3e0] text-[#f57c00] border-[#ffe1ba]',
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

export default function DashboardGreeting({ userName, activeRunCount, pendingGateCount }: DashboardGreetingProps) {
  const navigate = useNavigate();
  const subtitle = getOperationalSummary(activeRunCount, pendingGateCount);

  return (
    <section className="relative overflow-hidden rounded-[20px] border border-[#ece9e3] bg-[linear-gradient(135deg,#fffdfa_0%,#f8f8f7_48%,#f3edea_100%)] shadow-[0px_4px_16px_0px_rgba(26,26,26,0.05)]">
      <div className="pointer-events-none absolute right-[-80px] top-[-48px] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle_at_center,rgba(156,39,176,0.16),rgba(156,39,176,0)_70%)]" />
      <div className="pointer-events-none absolute bottom-[-90px] right-[100px] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle_at_center,rgba(33,150,243,0.12),rgba(33,150,243,0)_72%)]" />

      <div className="relative flex flex-col gap-6 px-[24px] py-[24px] sm:px-[28px] sm:py-[28px] lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[760px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ece9e3] bg-[#ffffffcc] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b6b6b]">
            <Sparkles size={12} className="text-[#9c27b0]" />
            Workflow Command Center
          </div>

          <div className="mt-4 space-y-2">
            <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#1a1a1a] sm:text-[32px]">
              {getGreeting()}, {userName}
            </h1>
            <p className="max-w-[640px] text-[13px] font-medium leading-[1.6] text-[#6b6b6b] sm:text-[14px]">
              {subtitle}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <StatusPill
              icon={Play}
              label={
                activeRunCount > 0
                  ? `${activeRunCount} active run${activeRunCount !== 1 ? 's' : ''}`
                  : 'No active runs'
              }
              tone="blue"
            />
            <StatusPill
              icon={ShieldAlert}
              label={
                pendingGateCount > 0
                  ? `${pendingGateCount} approval gate${pendingGateCount !== 1 ? 's' : ''}`
                  : 'No pending approvals'
              }
              tone="orange"
            />
            <StatusPill icon={GitBranch} label="Workflow Studio ready" tone="neutral" />
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
