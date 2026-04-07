import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Diamond,
  Download,
  FlaskConical,
  Files,
  MoreHorizontal,
  Play,
  Search,
  Settings,
  Shield,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { cn } from '@utils/cn';

const DEFAULT_AGENT_ID = 'agent_fea_opt';

const AGENT_STUDIO_FIXTURES = {
  agent_fea_opt: {
    id: 'agent_fea_opt',
    name: 'FEA Optimizer Agent',
    versionLabel: 'v2',
    versionStatus: 'draft',
    goal:
      'Given a CAD geometry and load specifications, determine optimal mesh density parameters and run FEA simulation to verify the design meets stress requirements under specified loads while minimizing part weight.',
    provider: 'Anthropic',
    model: 'claude-sonnet-4-6',
    llmWeight: 0.7,
    scoringStrategy: 'Weighted Blend',
    scoringWeights: [
      { label: 'Compatibility', value: 0.3 },
      { label: 'Trust', value: 0.25 },
      { label: 'Cost', value: 0.2 },
      { label: 'Latency', value: 0.15 },
      { label: 'Reliability', value: 0.1 },
    ],
    tools: [
      { id: 'fea-solver', name: 'FEA Solver', version: '2.1.0', permissions: ['read', 'exec'], maxCalls: 5 },
      { id: 'mesh-generator', name: 'Mesh Generator', version: '1.0.0', permissions: ['read', 'exec'], maxCalls: 10 },
      { id: 'result-analyzer', name: 'Result Analyzer', version: '1.0.0', permissions: ['read', 'exec'], maxCalls: 3 },
    ],
    policyRules: [
      'Auto-approve candidates above 0.85 confidence.',
      'Keep evaluation spend under $10 per run.',
      'Escalate any recommendation below 0.60 confidence.',
    ],
    pipeline: [
      { id: 'provider', title: 'Claude Sonnet 4', subtitle: 'anthropic', accent: '#ad35ff', icon: Diamond, trailing: 'chevron' },
      { id: 'agent', title: 'FEA Optimizer', subtitle: 'Goal: Minimize weight under constraints', accent: '#ad35ff', icon: Brain, selected: true },
      {
        id: 'tools',
        title: 'Tools (3)',
        subtitle: 'read, exec',
        accent: '#2f8cff',
        icon: Wrench,
        rows: [
          { label: 'fea-solver@2.1', permissions: 'read, exec' },
          { label: 'mesh-gen@1.0', permissions: 'read, exec' },
          { label: 'result-analyzer@1.0', permissions: 'read' },
        ],
      },
      { id: 'policy', title: 'Policy', subtitle: 'Auto-approve > 0.85\nBudget cap: $10.00', accent: '#ff9800', icon: Shield },
      { id: 'memory', title: 'Memory', subtitle: '12 entries', accent: '#607d8b', icon: Database, compact: true, value: '12 entries' },
    ],
    summaryChecks: [
      { label: 'Goal defined', status: 'pass' as const },
      { label: 'Model configured', status: 'pass' as const },
      { label: 'Tools assigned (3)', status: 'pass' as const },
      { label: 'Policy rules set', status: 'pass' as const },
      { label: 'Evals not run', status: 'warn' as const },
    ],
    performance: [
      { label: 'Total runs', value: '47' },
      { label: 'Success rate', value: '91%' },
      { label: 'Avg cost/run', value: '$1.85' },
      { label: 'Avg confidence', value: '0.88' },
      { label: 'Avg iterations', value: '2.3' },
    ],
    recentDecisions: [
      { title: 'Selected fea-solver', confidence: '0.92', detail: '2 min ago · $0.50', tone: 'success' as const },
      { title: 'Selected mesh-gen', confidence: '0.87', detail: '15 min ago · $0.42', tone: 'success' as const },
      { title: 'Escalated (low confidence)', confidence: '0.40', detail: '1h ago · $0.18', tone: 'danger' as const },
    ],
    metadata: [
      { label: 'Created', value: 'Mar 28, 2026' },
      { label: 'Modified', value: '12 min ago' },
    ],
  },
} as const;

const TABS = [
  { id: 'builder', label: 'Builder' },
  { id: 'playground', label: 'Playground' },
  { id: 'evals', label: 'Evals' },
  { id: 'runs', label: 'Runs' },
];

const UTILITY_ACTIONS = [
  { id: 'search', icon: Search, label: 'Search studio' },
  { id: 'copy', icon: Copy, label: 'Copy config' },
  { id: 'duplicate', icon: Files, label: 'Duplicate agent' },
  { id: 'download', icon: Download, label: 'Export config' },
  { id: 'settings', icon: Settings, label: 'Studio settings' },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b2aea8]">
      {children}
    </p>
  );
}

function PropertyField({
  label,
  value,
  mono,
  icon: Icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: typeof Sparkles;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[12px] text-[#8f8a83]">{label}</p>
      <div className={cn(
        'flex h-[40px] items-center justify-between border-b border-[#ece7e0] bg-transparent px-0 text-[15px] text-[#1f1f1f]',
        mono && 'font-mono text-[14px]'
      )}>
        <div className="flex items-center gap-2.5">
          {Icon ? <Icon size={14} className="text-[#ad35ff]" /> : null}
          <span>{value}</span>
        </div>
        <ChevronDown size={16} className="text-[#9b978f]" />
      </div>
    </div>
  );
}

function PermissionPill({ children, muted }: { children: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-[6px] px-2 py-1 text-[11px] font-medium',
        muted ? 'bg-[#f2f1ef] text-[#9b978f]' : 'bg-[#e9f4ff] text-[#2f8cff]'
      )}
    >
      {children}
    </span>
  );
}

function WeightToken({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] bg-[#fbfaf9] px-4 py-3">
      <p className="text-[12px] text-[#a19d97]">{label}</p>
      <div className="mt-3 inline-flex rounded-full bg-[#f3f1ee] px-3 py-1.5 text-[12px] font-semibold text-[#1f1f1f]">
        {value.toFixed(2)}
      </div>
    </div>
  );
}

export default function AgentStudioPage() {
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId?: string }>();
  const studioAgent = useMemo(() => {
    return AGENT_STUDIO_FIXTURES[agentId as keyof typeof AGENT_STUDIO_FIXTURES] ?? AGENT_STUDIO_FIXTURES[DEFAULT_AGENT_ID];
  }, [agentId]);

  const [activeTab, setActiveTab] = useState('builder');
  const [goal, setGoal] = useState(studioAgent.goal);
  const [llmWeight, setLlmWeight] = useState(studioAgent.llmWeight);
  const [selectedToolId, setSelectedToolId] = useState('mesh-generator');

  return (
    <div className="h-full min-h-0 overflow-hidden bg-[#f5f5f0]">
      <div className="flex h-full min-h-0 flex-col gap-3 px-[14px] py-[14px] lg:px-[18px] lg:py-[18px]">
        <div className="flex justify-center">
          <div className="flex w-full max-w-[992px] flex-wrap items-center gap-3 rounded-[18px] border border-[#ece9e3] bg-white px-[14px] py-[8px] shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
            <button
              type="button"
              onClick={() => navigate('/agents')}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[#8e8a84] transition-colors hover:bg-[#f5f3ef] hover:text-[#1a1a1a]"
              aria-label="Back to agents"
            >
              <ArrowLeft size={17} />
            </button>

            <div className="min-w-0 flex items-center gap-3 pr-2">
              <h1 className="truncate text-[15px] font-semibold text-[#1a1a1a]">
                {studioAgent.name}
              </h1>
              <span className="inline-flex flex-col rounded-[10px] bg-[#f6e6ff] px-2 py-1 text-[11px] font-medium leading-[1.05] text-[#ad35ff]">
                <span>{studioAgent.versionLabel}</span>
                <span>{studioAgent.versionStatus}</span>
              </span>
            </div>

            <nav className="order-3 flex min-w-0 flex-1 items-center justify-start gap-6 pl-0 text-[14px] lg:order-none lg:ml-5 lg:flex-none lg:pl-4">
              {TABS.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
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

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-[38px] items-center rounded-[11px] border border-[#1f1f1f] bg-white px-4 text-[14px] font-medium text-[#1f1f1f] transition-colors hover:bg-[#f7f5f2]"
              >
                Save Draft
              </button>
              <button
                type="button"
                className="inline-flex h-[38px] items-center rounded-[11px] border border-[#d87aff] bg-white px-4 text-[14px] font-medium text-[#8b2bc7] transition-colors hover:bg-[#fcf5ff]"
              >
                Validate
              </button>
              <button
                type="button"
                className="inline-flex h-[38px] items-center rounded-[11px] bg-[#1f1f1f] px-4 text-[14px] font-medium text-white transition-colors hover:bg-[#111111]"
              >
                Publish v2
              </button>
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#2d2d2d] text-[14px] font-semibold text-white">
                S
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)] lg:w-[310px]">
            <div className="px-5 pb-4 pt-5">
              <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Agent Pipeline</h2>
            </div>

            <div className="relative px-4 pb-4">
              <div className="pointer-events-none absolute left-[46px] top-[56px] bottom-[96px] w-px bg-[#ebe7e1]" />

              <div className="space-y-6">
                {studioAgent.pipeline.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.id} className="relative pl-2">
                      <div
                        className={cn(
                          'rounded-[16px] border bg-white px-4 py-4 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.03)]',
                          item.selected
                            ? 'border-[#ad35ff] ring-1 ring-[#ad35ff]'
                            : 'border-[#ece9e3]'
                        )}
                        style={{ borderLeftWidth: 3, borderLeftColor: item.accent }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full">
                            <Icon size={15} color={item.accent} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-[13px] font-semibold text-[#1f1f1f]">
                                {item.title}
                              </p>
                              {item.trailing === 'chevron' && (
                                <ChevronRight size={15} className="shrink-0 text-[#9b978f]" />
                              )}
                            </div>

                            {item.rows ? (
                              <div className="mt-3 space-y-2 text-[12px] text-[#7f7a74]">
                                {item.rows.map((row) => (
                                  <div key={row.label} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <span className="h-[6px] w-[6px] rounded-full bg-[#2f8cff]" />
                                      <span className="font-mono text-[11px]">{row.label}</span>
                                    </div>
                                    <span className="text-[11px] text-[#a4a09a]">{row.permissions}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className={cn('mt-1', item.compact && 'flex items-center justify-between gap-3')}>
                                <p className="whitespace-pre-line text-[12px] leading-[1.45] text-[#9b978f]">
                                  {item.subtitle}
                                </p>
                                {item.compact && item.value ? (
                                  <span className="shrink-0 text-[12px] text-[#9b978f]">{item.value}</span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-4 pb-4 pt-1 text-center">
              <p className="text-[12px] text-[#b2aea8]">Pipeline version 2 · Draft</p>
            </div>

            <div className="mx-4 mb-4 mt-auto flex items-center gap-2 rounded-full border border-[#eeeae3] bg-[#fbfaf9] px-4 py-2 text-[12px] text-[#8b867f] shadow-[0px_1px_6px_0px_rgba(0,0,0,0.03)]">
              <span className="h-[7px] w-[7px] rounded-full bg-[#ad35ff]" />
              <span>Draft</span>
              <span className="text-[#cfc9c1]">·</span>
              <span>{studioAgent.versionLabel} unsaved</span>
            </div>
          </aside>

          <section className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
            <div className="h-full overflow-y-auto px-6 pb-28 pt-6 scrollbar-hide lg:px-7">
              <div className="space-y-8">
                <section>
                  <SectionLabel>Goal</SectionLabel>
                  <div className="min-h-[108px] px-2">
                    <textarea
                      value={goal}
                      onChange={(event) => setGoal(event.target.value.slice(0, 500))}
                      className="min-h-[72px] w-full resize-none border-none bg-transparent px-0 py-0 text-[15px] leading-[1.45] text-[#1f1f1f] outline-none"
                    />
                    <div className="mt-1 text-right text-[11px] text-[#b2aea8]">
                      {goal.length} / 500
                    </div>
                  </div>
                </section>

                <section>
                  <SectionLabel>Model Configuration</SectionLabel>
                  <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1.12fr)_288px]">
                    <div className="space-y-4">
                      <PropertyField label="Provider" value={studioAgent.provider} icon={Sparkles} />
                      <PropertyField label="Model" value={studioAgent.model} mono />
                    </div>

                    <div className="px-0 py-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] text-[#8f8a83]">LLM Weight</p>
                        <span className="text-[15px] font-semibold text-[#ad35ff]">
                          {llmWeight.toFixed(1)}
                        </span>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={llmWeight}
                        onChange={(event) => setLlmWeight(Number(event.target.value))}
                        className="mt-5 h-2 w-full cursor-pointer accent-[#ad35ff]"
                      />

                      <div className="mt-3 flex items-center justify-between text-[12px] text-[#9b978f]">
                        <span>Algorithmic {(1 - llmWeight).toFixed(1)} / LLM {llmWeight.toFixed(1)}</span>
                        <span className="font-medium text-[#ad35ff]">{llmWeight.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <SectionLabel>Tool Permissions</SectionLabel>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1.35fr)_96px_160px_84px] gap-3 px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#b2aea8]">
                      <span>Tool</span>
                      <span>Version</span>
                      <span>Permissions</span>
                      <span>Max Calls</span>
                    </div>

                    {studioAgent.tools.map((tool) => {
                      const selected = tool.id === selectedToolId;

                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => setSelectedToolId(tool.id)}
                          className={cn(
                            'grid w-full grid-cols-[minmax(0,1.35fr)_96px_160px_84px] items-center gap-3 rounded-[14px] border px-4 py-3 text-left transition-colors',
                            selected
                              ? 'border-[#e7e3dd] bg-[#f4f3f1]'
                              : 'border-transparent bg-transparent hover:bg-[#faf8f5]'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="h-[7px] w-[7px] rounded-full bg-[#2f8cff]" />
                            <span className="text-[14px] font-medium text-[#1f1f1f]">{tool.name}</span>
                          </div>
                          <span className="font-mono text-[13px] text-[#99958f]">{tool.version}</span>
                          <div className="flex items-center gap-2">
                            {tool.permissions.map((permission) => (
                              <PermissionPill key={permission} muted={permission !== 'exec' && tool.id === 'result-analyzer'}>
                                {permission}
                              </PermissionPill>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <span className={cn(
                              'inline-flex min-w-[42px] justify-center rounded-[10px] px-3 py-2 text-[13px]',
                              selected
                                ? 'border border-[#d9d5ce] bg-white text-[#1f1f1f]'
                                : 'text-[#6f6a63]'
                            )}>
                              {tool.maxCalls}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="mt-3 text-[14px] font-medium text-[#ad35ff] transition-colors hover:text-[#8b2bc7]"
                  >
                    + Add Tool
                  </button>
                </section>

                <section>
                  <SectionLabel>Scoring Strategy</SectionLabel>
                  <div className="px-0 py-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] text-[#1f1f1f]">{studioAgent.scoringStrategy}</span>
                      <ChevronDown size={16} className="text-[#9b978f]" />
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {studioAgent.scoringWeights.map((weight) => (
                        <WeightToken key={weight.label} label={weight.label} value={weight.value} />
                      ))}
                    </div>

                    <p className="mt-4 text-[12px] font-medium text-[#4caf50]">
                      Weights must sum to 1.0 · Current: 1.0
                    </p>
                  </div>
                </section>

                <section>
                  <SectionLabel>Policy Rules</SectionLabel>
                  <div className="space-y-3">
                    {studioAgent.policyRules.map((rule) => (
                      <div key={rule} className="text-[14px] leading-[1.55] text-[#4f4a43]">
                        {rule}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <div className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 lg:block">
              <div className="flex items-center gap-3 rounded-full border border-[#ece9e3] bg-white px-3 py-2 shadow-[0px_6px_16px_0px_rgba(0,0,0,0.08)]">
                <button
                  type="button"
                  className="inline-flex h-[36px] min-w-[154px] items-center justify-center gap-2 rounded-[11px] bg-[#1f1f1f] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#111111]"
                >
                  <Play size={13} strokeWidth={2} />
                  <span>Test in Playground</span>
                </button>
                <button
                  type="button"
                  className="inline-flex h-[36px] min-w-[114px] items-center justify-center gap-2 rounded-[11px] border border-[#d87aff] bg-white px-4 text-[12px] font-medium text-[#a43df0] transition-colors hover:bg-[#fcf5ff]"
                >
                  <FlaskConical size={13} strokeWidth={2} />
                  <span>Run Evals</span>
                </button>
                <span className="whitespace-nowrap text-[12px] text-[#8f8a83]">
                  3 tools · 2 policies · 12 memories
                </span>
              </div>
            </div>
          </section>

          <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)] lg:w-[260px]">
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
              <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Summary</h2>
              <button
                type="button"
                className="rounded-full p-1 text-[#a5a099] transition-colors hover:bg-[#f5f3ef] hover:text-[#1a1a1a]"
                aria-label="More summary actions"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 scrollbar-hide">
              <section className="border-b border-[#f0ede8] pb-5">
                <SectionLabel>Agent</SectionLabel>
                <h3 className="text-[16px] font-semibold text-[#1f1f1f]">{studioAgent.name.replace(' Agent', '')}</h3>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#f6e6ff] px-3 py-1 text-[11px] font-medium text-[#ad35ff]">
                  <Brain size={12} />
                  Agent
                </div>
                <p className="mt-2 text-[14px] text-[#8f8a83]">Version 2 · Draft</p>
              </section>

              <section className="border-b border-[#f0ede8] py-5">
                <SectionLabel>Health Check</SectionLabel>
                <div className="space-y-2.5">
                  {studioAgent.summaryChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-2.5 text-[14px]">
                      {check.status === 'pass' ? (
                        <Check size={14} className="text-[#4caf50]" />
                      ) : (
                        <Sparkles size={14} className="text-[#ff9800]" />
                      )}
                      <span className={check.status === 'pass' ? 'text-[#1f1f1f]' : 'text-[#ff9800]'}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 h-[4px] overflow-hidden rounded-full bg-[#efede8]">
                  <div className="h-full w-4/5 rounded-full bg-[#4caf50]" />
                </div>
                <p className="mt-2 text-right text-[12px] text-[#8f8a83]">4/5 checks passed</p>
              </section>

              <section className="border-b border-[#f0ede8] py-5">
                <SectionLabel>Performance</SectionLabel>
                <div className="space-y-2.5 text-[14px]">
                  {studioAgent.performance.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <span className="text-[#8f8a83]">{item.label}</span>
                      <span className={cn(
                        'font-medium text-[#1f1f1f]',
                        item.label === 'Success rate' && 'text-[#4caf50]'
                      )}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border-b border-[#f0ede8] py-5">
                <SectionLabel>Recent Decisions</SectionLabel>
                <div className="space-y-4">
                  {studioAgent.recentDecisions.map((decision) => (
                    <div key={decision.title} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[14px] font-medium text-[#1f1f1f]">{decision.title}</p>
                        <span className={cn(
                          'text-[14px] font-medium',
                          decision.tone === 'success' ? 'text-[#4caf50]' : 'text-[#e74c3c]'
                        )}>
                          {decision.confidence}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#9b978f]">{decision.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="py-5">
                <SectionLabel>Metadata</SectionLabel>
                <div className="space-y-2.5 text-[14px]">
                  {studioAgent.metadata.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <span className="text-[#8f8a83]">{item.label}</span>
                      <span className="text-[#1f1f1f]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </aside>

          <div className="hidden shrink-0 items-center lg:flex">
            <div className="flex flex-col gap-2 rounded-[16px] border border-[#ece9e3] bg-white p-2 shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
              {UTILITY_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    aria-label={action.label}
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] text-[#8f8a83] transition-colors hover:bg-[#f6f3ef] hover:text-[#1f1f1f]"
                  >
                    <Icon size={17} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="flex flex-wrap items-center gap-3 rounded-[18px] border border-[#ece9e3] bg-white px-4 py-3 shadow-[0px_4px_14px_0px_rgba(0,0,0,0.05)]">
            <button
              type="button"
              className="inline-flex h-[40px] min-w-[164px] items-center justify-center gap-2 rounded-[12px] bg-[#1f1f1f] px-4 text-[14px] font-medium text-white"
            >
              <Play size={16} />
              <span>Test in Playground</span>
            </button>
            <button
              type="button"
              className="inline-flex h-[40px] min-w-[124px] items-center justify-center gap-2 rounded-[12px] border border-[#d87aff] bg-white px-4 text-[14px] font-medium text-[#a43df0]"
            >
              <FlaskConical size={16} />
              <span>Run Evals</span>
            </button>
            <span className="text-[14px] text-[#8f8a83]">3 tools · 2 policies · 12 memories</span>
          </div>
        </div>
      </div>
    </div>
  );
}
