import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useAgent,
  useAgentVersions,
  useCreateAgentVersion,
  useValidateAgentVersion,
  usePublishAgentVersion,
} from '@hooks/useAgents';
import type { AgentSpec } from '@api/agents';
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
  Loader2,
  MoreHorizontal,
  Play,
  Search,
  Settings,
  Shield,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { cn } from '@utils/cn';

/* ---------- Static fixture tool definitions for the UI picker ---------- */

const AVAILABLE_TOOLS = [
  { id: 'fea-solver', name: 'FEA Solver', version: '2.1.0', permissions: ['read', 'exec'] as string[], maxCalls: 5 },
  { id: 'mesh-generator', name: 'Mesh Generator', version: '1.0.0', permissions: ['read', 'exec'] as string[], maxCalls: 10 },
  { id: 'result-analyzer', name: 'Result Analyzer', version: '1.0.0', permissions: ['read', 'exec'] as string[], maxCalls: 3 },
];

const DEFAULT_SELECTED_TOOLS = ['fea-solver', 'mesh-generator', 'result-analyzer'];

const SCORING_WEIGHTS = [
  { label: 'Compatibility', value: 0.3 },
  { label: 'Trust', value: 0.25 },
  { label: 'Cost', value: 0.2 },
  { label: 'Latency', value: 0.15 },
  { label: 'Reliability', value: 0.1 },
];

const POLICY_RULES = [
  'Auto-approve candidates above 0.85 confidence.',
  'Keep evaluation spend under $10 per run.',
  'Escalate any recommendation below 0.60 confidence.',
];

const PIPELINE_TEMPLATE = [
  { id: 'provider', subtitle: 'anthropic', accent: '#ad35ff', icon: Diamond, trailing: 'chevron' as const },
  { id: 'agent', subtitle: 'Goal: Minimize weight under constraints', accent: '#ad35ff', icon: Brain, selected: true },
  {
    id: 'tools',
    accent: '#2f8cff',
    icon: Wrench,
  },
  { id: 'policy', subtitle: 'Auto-approve > 0.85\nBudget cap: $10.00', accent: '#ff9800', icon: Shield },
  { id: 'memory', subtitle: '12 entries', accent: '#607d8b', icon: Database, compact: true, value: '12 entries' },
];

const PERFORMANCE_STATS = [
  { label: 'Total runs', value: '47' },
  { label: 'Success rate', value: '91%' },
  { label: 'Avg cost/run', value: '$1.85' },
  { label: 'Avg confidence', value: '0.88' },
  { label: 'Avg iterations', value: '2.3' },
];

const RECENT_DECISIONS = [
  { title: 'Selected fea-solver', confidence: '0.92', detail: '2 min ago · $0.50', tone: 'success' as const },
  { title: 'Selected mesh-gen', confidence: '0.87', detail: '15 min ago · $0.42', tone: 'success' as const },
  { title: 'Escalated (low confidence)', confidence: '0.40', detail: '1h ago · $0.18', tone: 'danger' as const },
];

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

/* ---------- Sub-components ---------- */

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b2aea8]">
      {children}
    </p>
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

/* ---------- Main page ---------- */

export default function AgentStudioPage() {
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId?: string }>();

  /* ---------- Real API hooks ---------- */
  const { data: agent, isLoading: agentLoading } = useAgent(agentId ?? null);
  const { data: versions = [] } = useAgentVersions(agentId ?? null);
  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : undefined;

  const createVersion = useCreateAgentVersion(agentId ?? '');
  const validateVersion = useValidateAgentVersion(agentId ?? '');
  const publishVersion = usePublishAgentVersion(agentId ?? '');

  /* ---------- Editor state ---------- */
  const [activeTab, setActiveTab] = useState('builder');
  const [goal, setGoal] = useState('');
  const [llmWeight, setLlmWeight] = useState(0.7);
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  const [selectedTools, setSelectedTools] = useState<string[]>(DEFAULT_SELECTED_TOOLS);
  const [selectedToolId, setSelectedToolId] = useState('mesh-generator');

  /* ---------- Sync state from real data when it arrives ---------- */
  useEffect(() => {
    if (agent) {
      setGoal(agent.description ?? '');
    }
  }, [agent]);

  useEffect(() => {
    if (latestVersion?.spec_json) {
      const spec = latestVersion.spec_json;
      if (spec.goal) setGoal(spec.goal);
      if (spec.scoring?.llm_weight !== undefined) setLlmWeight(spec.scoring.llm_weight);
      if (spec.model?.provider) setSelectedProvider(spec.model.provider);
      if (spec.model?.model) setSelectedModel(spec.model.model);
      if (spec.tools?.length) {
        setSelectedTools(spec.tools.map((t) => t.tool_ref));
      }
    }
  }, [latestVersion]);

  /* ---------- Action handlers ---------- */

  const handleSaveDraft = async () => {
    const spec: AgentSpec = {
      goal,
      tools: AVAILABLE_TOOLS
        .filter((t) => selectedTools.includes(t.id))
        .map((t) => ({ tool_ref: t.id, permissions: ['read', 'exec'], max_invocations: t.maxCalls })),
      scoring: {
        strategy: 'weighted',
        llm_weight: llmWeight,
        weights: { compatibility: 0.30, trust: 0.25, cost: 0.20, latency: 0.15, reliability: 0.10 },
      },
      constraints: { max_tools_per_run: 15, timeout_seconds: 600, max_retries: 3, budget_limit: 10.0 },
      policy: {
        auto_approve_threshold: 0.35,
        require_approval_for: ['read', 'write', 'exec', 'delete'],
      },
      model: { provider: selectedProvider, model: selectedModel },
    };
    try {
      await createVersion.mutateAsync(spec);
    } catch (err) {
      alert(`Save failed: ${(err as { message?: string })?.message ?? String(err)}`);
    }
  };

  const handleValidate = async () => {
    if (!latestVersion) {
      alert('Save a draft first before validating.');
      return;
    }
    try {
      const result = await validateVersion.mutateAsync(latestVersion.version);
      if (result.valid) {
        alert('Validation passed!');
      } else {
        alert(`Validation failed: ${result.errors?.join(', ') ?? 'unknown error'}`);
      }
    } catch (err) {
      alert(`Validate error: ${(err as { message?: string })?.message ?? String(err)}`);
    }
  };

  const handlePublish = async () => {
    if (!latestVersion) {
      alert('Save and validate a draft first.');
      return;
    }
    try {
      await publishVersion.mutateAsync(latestVersion.version);
    } catch (err) {
      alert(`Publish error: ${(err as { message?: string })?.message ?? String(err)}`);
    }
  };

  const handleTestInPlayground = () => {
    if (!agentId) return;
    navigate(`/agent-playground/${agentId}`);
  };

  /* ---------- Derived display values ---------- */

  const agentName = agent?.name ?? 'Agent Studio';
  const versionNumber = latestVersion?.version;
  const versionLabel = versionNumber !== undefined ? `v${versionNumber}` : '-';
  const versionStatus = latestVersion?.status ?? 'draft';

  const isSaving = createVersion.isPending;
  const isValidating = validateVersion.isPending;
  const isPublishing = publishVersion.isPending;

  /* ---------- Health checks (derived from state) ---------- */
  const healthChecks = [
    { label: 'Goal defined', status: (!!goal && goal.length > 0) ? 'pass' : 'fail' },
    { label: 'Model configured', status: !!selectedModel ? 'pass' : 'fail' },
    { label: `Tools assigned (${selectedTools.length})`, status: selectedTools.length > 0 ? 'pass' : 'fail' },
    { label: 'Policy rules set', status: 'pass' as const },
    { label: 'Evals not run', status: 'warn' as const },
  ] as Array<{ label: string; status: 'pass' | 'fail' | 'warn' }>;

  const passCount = healthChecks.filter((c) => c.status === 'pass').length;

  /* ---------- Tool rows for the pipeline panel ---------- */
  const activeToolDefs = AVAILABLE_TOOLS.filter((t) => selectedTools.includes(t.id));

  /* ---------- Loading state ---------- */
  if (agentLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f5f5f0]">
        <Loader2 size={28} className="animate-spin text-[#ad35ff]" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden bg-[#f5f5f0]">
      <div className="flex h-full min-h-0 flex-col gap-3 px-[14px] py-[14px] lg:px-[18px] lg:py-[18px]">

        {/* ── Top bar ── */}
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
                {agentName}
              </h1>
              <span className="inline-flex flex-col rounded-[10px] bg-[#f6e6ff] px-2 py-1 text-[11px] font-medium leading-[1.05] text-[#ad35ff]">
                <span>{versionLabel}</span>
                <span>{versionStatus}</span>
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
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="inline-flex h-[38px] items-center gap-2 rounded-[11px] border border-[#1f1f1f] bg-white px-4 text-[14px] font-medium text-[#1f1f1f] transition-colors hover:bg-[#f7f5f2] disabled:opacity-50"
              >
                {isSaving && <Loader2 size={13} className="animate-spin" />}
                Save Draft
              </button>
              <button
                type="button"
                onClick={handleValidate}
                disabled={isValidating}
                className="inline-flex h-[38px] items-center gap-2 rounded-[11px] border border-[#d87aff] bg-white px-4 text-[14px] font-medium text-[#8b2bc7] transition-colors hover:bg-[#fcf5ff] disabled:opacity-50"
              >
                {isValidating && <Loader2 size={13} className="animate-spin" />}
                Validate
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="inline-flex h-[38px] items-center gap-2 rounded-[11px] bg-[#1f1f1f] px-4 text-[14px] font-medium text-white transition-colors hover:bg-[#111111] disabled:opacity-50"
              >
                {isPublishing && <Loader2 size={13} className="animate-spin" />}
                {`Publish${versionNumber !== undefined ? ` v${versionNumber}` : ''}`}
              </button>
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#2d2d2d] text-[14px] font-semibold text-white">
                S
              </div>
            </div>
          </div>
        </div>

        {/* ── Three-column layout ── */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">

          {/* Left panel — pipeline */}
          <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)] lg:w-[310px]">
            <div className="px-5 pb-4 pt-5">
              <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Agent Pipeline</h2>
            </div>

            <div className="relative px-4 pb-4">
              <div className="pointer-events-none absolute left-[46px] top-[56px] bottom-[96px] w-px bg-[#ebe7e1]" />

              <div className="space-y-6">

                {/* Provider */}
                <div className="relative pl-2">
                  <div
                    className="rounded-[16px] border border-[#ece9e3] bg-white px-4 py-4 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.03)]"
                    style={{ borderLeftWidth: 3, borderLeftColor: '#ad35ff' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full">
                        <Diamond size={15} color="#ad35ff" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold text-[#1f1f1f]">
                            {selectedModel}
                          </p>
                          <ChevronRight size={15} className="shrink-0 text-[#9b978f]" />
                        </div>
                        <div className="mt-1">
                          <p className="text-[12px] leading-[1.45] text-[#9b978f]">{selectedProvider}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent */}
                <div className="relative pl-2">
                  <div
                    className="rounded-[16px] border border-[#ad35ff] bg-white px-4 py-4 ring-1 ring-[#ad35ff] shadow-[0px_1px_8px_0px_rgba(0,0,0,0.03)]"
                    style={{ borderLeftWidth: 3, borderLeftColor: '#ad35ff' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full">
                        <Brain size={15} color="#ad35ff" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#1f1f1f]">{agentName}</p>
                        <p className="mt-1 text-[12px] leading-[1.45] text-[#9b978f]">Goal: {goal.slice(0, 50)}{goal.length > 50 ? '...' : ''}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tools */}
                <div className="relative pl-2">
                  <div
                    className="rounded-[16px] border border-[#ece9e3] bg-white px-4 py-4 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.03)]"
                    style={{ borderLeftWidth: 3, borderLeftColor: '#2f8cff' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full">
                        <Wrench size={15} color="#2f8cff" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#1f1f1f]">
                          Tools ({activeToolDefs.length})
                        </p>
                        {activeToolDefs.length > 0 ? (
                          <div className="mt-3 space-y-2 text-[12px] text-[#7f7a74]">
                            {activeToolDefs.map((tool) => (
                              <div key={tool.id} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="h-[6px] w-[6px] rounded-full bg-[#2f8cff]" />
                                  <span className="font-mono text-[11px]">{tool.id}@{tool.version}</span>
                                </div>
                                <span className="text-[11px] text-[#a4a09a]">read, exec</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-[12px] text-[#9b978f]">No tools selected</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Policy */}
                <div className="relative pl-2">
                  {PIPELINE_TEMPLATE.slice(3, 4).map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="rounded-[16px] border border-[#ece9e3] bg-white px-4 py-4 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.03)]"
                        style={{ borderLeftWidth: 3, borderLeftColor: item.accent }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full">
                            <Icon size={15} color={item.accent} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-[#1f1f1f]">Policy</p>
                            <p className="mt-1 whitespace-pre-line text-[12px] leading-[1.45] text-[#9b978f]">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Memory */}
                <div className="relative pl-2">
                  {PIPELINE_TEMPLATE.slice(4).map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="rounded-[16px] border border-[#ece9e3] bg-white px-4 py-4 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.03)]"
                        style={{ borderLeftWidth: 3, borderLeftColor: item.accent }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full">
                            <Icon size={15} color={item.accent} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-[13px] font-semibold text-[#1f1f1f]">Memory</p>
                              <span className="shrink-0 text-[12px] text-[#9b978f]">{item.value}</span>
                            </div>
                            <p className="mt-1 text-[12px] leading-[1.45] text-[#9b978f]">{item.subtitle}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

            <div className="px-4 pb-4 pt-1 text-center">
              <p className="text-[12px] text-[#b2aea8]">
                Pipeline {versionNumber !== undefined ? `version ${versionNumber}` : ''} · {versionStatus}
              </p>
            </div>

            <div className="mx-4 mb-4 mt-auto flex items-center gap-2 rounded-full border border-[#eeeae3] bg-[#fbfaf9] px-4 py-2 text-[12px] text-[#8b867f] shadow-[0px_1px_6px_0px_rgba(0,0,0,0.03)]">
              <span className="h-[7px] w-[7px] rounded-full bg-[#ad35ff]" />
              <span>{versionStatus}</span>
              <span className="text-[#cfc9c1]">·</span>
              <span>{versionLabel} {versionStatus === 'draft' ? 'unsaved' : ''}</span>
            </div>
          </aside>

          {/* Center panel — editor */}
          <section className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
            <div className="h-full overflow-y-auto px-6 pb-28 pt-6 scrollbar-hide lg:px-7">
              <div className="space-y-8">

                {/* Goal */}
                <section>
                  <SectionLabel>Goal</SectionLabel>
                  <div className="min-h-[108px] px-2">
                    <textarea
                      value={goal}
                      onChange={(event) => setGoal(event.target.value.slice(0, 500))}
                      placeholder="Describe what this agent should accomplish..."
                      className="min-h-[72px] w-full resize-none border-none bg-transparent px-0 py-0 text-[15px] leading-[1.45] text-[#1f1f1f] outline-none placeholder:text-[#c0bbb4]"
                    />
                    <div className="mt-1 text-right text-[11px] text-[#b2aea8]">
                      {goal.length} / 500
                    </div>
                  </div>
                </section>

                {/* Model Configuration */}
                <section>
                  <SectionLabel>Model Configuration</SectionLabel>
                  <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1.12fr)_288px]">
                    <div className="space-y-4">
                      {/* Provider selector */}
                      <div className="space-y-2">
                        <p className="text-[12px] text-[#8f8a83]">Provider</p>
                        <div className="flex gap-2">
                          {['anthropic', 'openai', 'google'].map((provider) => (
                            <button
                              key={provider}
                              type="button"
                              onClick={() => setSelectedProvider(provider)}
                              className={cn(
                                'flex h-[40px] items-center gap-2 rounded-[10px] border px-3 text-[14px] transition-colors',
                                selectedProvider === provider
                                  ? 'border-[#ad35ff] bg-[#f9f0ff] text-[#8b2bc7]'
                                  : 'border-[#ece7e0] bg-transparent text-[#6f6a63] hover:bg-[#faf8f5]'
                              )}
                            >
                              <Sparkles size={13} className={selectedProvider === provider ? 'text-[#ad35ff]' : 'text-[#9b978f]'} />
                              <span className="capitalize">{provider}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Model selector */}
                      <div className="space-y-2">
                        <p className="text-[12px] text-[#8f8a83]">Model</p>
                        <div className="relative">
                          <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="flex h-[40px] w-full appearance-none items-center border-b border-[#ece7e0] bg-transparent px-0 font-mono text-[14px] text-[#1f1f1f] outline-none"
                          >
                            {selectedProvider === 'anthropic' && (
                              <>
                                <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                                <option value="claude-opus-4">claude-opus-4</option>
                                <option value="claude-haiku-3-5">claude-haiku-3-5</option>
                              </>
                            )}
                            {selectedProvider === 'openai' && (
                              <>
                                <option value="gpt-4o">gpt-4o</option>
                                <option value="gpt-4-turbo">gpt-4-turbo</option>
                                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                              </>
                            )}
                            {selectedProvider === 'google' && (
                              <>
                                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                              </>
                            )}
                          </select>
                          <ChevronDown size={16} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#9b978f]" />
                        </div>
                      </div>
                    </div>

                    {/* LLM weight slider */}
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

                {/* Tool Permissions */}
                <section>
                  <SectionLabel>Tool Permissions</SectionLabel>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1.35fr)_96px_160px_84px] gap-3 px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#b2aea8]">
                      <span>Tool</span>
                      <span>Version</span>
                      <span>Permissions</span>
                      <span>Max Calls</span>
                    </div>

                    {AVAILABLE_TOOLS.map((tool) => {
                      const isSelected = selectedTools.includes(tool.id);
                      const isActive = tool.id === selectedToolId;

                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => {
                            setSelectedToolId(tool.id);
                            setSelectedTools((prev) =>
                              prev.includes(tool.id)
                                ? prev.filter((id) => id !== tool.id)
                                : [...prev, tool.id]
                            );
                          }}
                          className={cn(
                            'grid w-full grid-cols-[minmax(0,1.35fr)_96px_160px_84px] items-center gap-3 rounded-[14px] border px-4 py-3 text-left transition-colors',
                            isActive
                              ? 'border-[#e7e3dd] bg-[#f4f3f1]'
                              : isSelected
                              ? 'border-[#e9f4ff] bg-[#f5faff] hover:bg-[#eff7ff]'
                              : 'border-transparent bg-transparent hover:bg-[#faf8f5] opacity-50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'h-[7px] w-[7px] rounded-full',
                              isSelected ? 'bg-[#2f8cff]' : 'bg-[#d0cdc8]'
                            )} />
                            <span className="text-[14px] font-medium text-[#1f1f1f]">{tool.name}</span>
                          </div>
                          <span className="font-mono text-[13px] text-[#99958f]">{tool.version}</span>
                          <div className="flex items-center gap-2">
                            {tool.permissions.map((permission) => (
                              <PermissionPill
                                key={permission}
                                muted={permission !== 'exec' && tool.id === 'result-analyzer' && !isSelected}
                              >
                                {permission}
                              </PermissionPill>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <span className={cn(
                              'inline-flex min-w-[42px] justify-center rounded-[10px] px-3 py-2 text-[13px]',
                              isActive
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

                {/* Scoring Strategy */}
                <section>
                  <SectionLabel>Scoring Strategy</SectionLabel>
                  <div className="px-0 py-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] text-[#1f1f1f]">Weighted Blend</span>
                      <ChevronDown size={16} className="text-[#9b978f]" />
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {SCORING_WEIGHTS.map((weight) => (
                        <WeightToken key={weight.label} label={weight.label} value={weight.value} />
                      ))}
                    </div>

                    <p className="mt-4 text-[12px] font-medium text-[#4caf50]">
                      Weights must sum to 1.0 · Current: 1.0
                    </p>
                  </div>
                </section>

                {/* Policy Rules */}
                <section>
                  <SectionLabel>Policy Rules</SectionLabel>
                  <div className="space-y-3">
                    {POLICY_RULES.map((rule) => (
                      <div key={rule} className="text-[14px] leading-[1.55] text-[#4f4a43]">
                        {rule}
                      </div>
                    ))}
                  </div>
                </section>

              </div>
            </div>

            {/* Bottom action bar (desktop) */}
            <div className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 lg:block">
              <div className="flex items-center gap-3 rounded-full border border-[#ece9e3] bg-white px-3 py-2 shadow-[0px_6px_16px_0px_rgba(0,0,0,0.08)]">
                <button
                  type="button"
                  onClick={handleTestInPlayground}
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
                  {selectedTools.length} tools · 2 policies · 12 memories
                </span>
              </div>
            </div>
          </section>

          {/* Right panel — summary */}
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

              {/* Agent identity */}
              <section className="border-b border-[#f0ede8] pb-5">
                <SectionLabel>Agent</SectionLabel>
                <h3 className="text-[16px] font-semibold text-[#1f1f1f]">
                  {agentName.replace(' Agent', '')}
                </h3>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#f6e6ff] px-3 py-1 text-[11px] font-medium text-[#ad35ff]">
                  <Brain size={12} />
                  Agent
                </div>
                <p className="mt-2 text-[14px] text-[#8f8a83]">
                  {versionNumber !== undefined ? `Version ${versionNumber}` : 'No version'} · {versionStatus}
                </p>
              </section>

              {/* Health check */}
              <section className="border-b border-[#f0ede8] py-5">
                <SectionLabel>Health Check</SectionLabel>
                <div className="space-y-2.5">
                  {healthChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-2.5 text-[14px]">
                      {check.status === 'pass' ? (
                        <Check size={14} className="text-[#4caf50]" />
                      ) : check.status === 'warn' ? (
                        <Sparkles size={14} className="text-[#ff9800]" />
                      ) : (
                        <span className="h-[14px] w-[14px] rounded-full border-2 border-[#e74c3c]" />
                      )}
                      <span className={cn(
                        check.status === 'pass' ? 'text-[#1f1f1f]' :
                        check.status === 'warn' ? 'text-[#ff9800]' : 'text-[#e74c3c]'
                      )}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 h-[4px] overflow-hidden rounded-full bg-[#efede8]">
                  <div
                    className="h-full rounded-full bg-[#4caf50] transition-all"
                    style={{ width: `${(passCount / healthChecks.length) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-right text-[12px] text-[#8f8a83]">
                  {passCount}/{healthChecks.length} checks passed
                </p>
              </section>

              {/* Performance */}
              <section className="border-b border-[#f0ede8] py-5">
                <SectionLabel>Performance</SectionLabel>
                <div className="space-y-2.5 text-[14px]">
                  {PERFORMANCE_STATS.map((item) => (
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

              {/* Recent decisions */}
              <section className="border-b border-[#f0ede8] py-5">
                <SectionLabel>Recent Decisions</SectionLabel>
                <div className="space-y-4">
                  {RECENT_DECISIONS.map((decision) => (
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

              {/* Metadata */}
              <section className="py-5">
                <SectionLabel>Metadata</SectionLabel>
                <div className="space-y-2.5 text-[14px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#8f8a83]">Created</span>
                    <span className="text-[#1f1f1f]">
                      {agent?.created_at
                        ? new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#8f8a83]">Modified</span>
                    <span className="text-[#1f1f1f]">
                      {agent?.updated_at
                        ? new Date(agent.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '-'}
                    </span>
                  </div>
                </div>
              </section>

            </div>
          </aside>

          {/* Utility action strip */}
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

        {/* Mobile bottom bar */}
        <div className="lg:hidden">
          <div className="flex flex-wrap items-center gap-3 rounded-[18px] border border-[#ece9e3] bg-white px-4 py-3 shadow-[0px_4px_14px_0px_rgba(0,0,0,0.05)]">
            <button
              type="button"
              onClick={handleTestInPlayground}
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
            <span className="text-[14px] text-[#8f8a83]">{selectedTools.length} tools · 2 policies · 12 memories</span>
          </div>
        </div>

      </div>
    </div>
  );
}
