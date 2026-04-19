import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  useAgent,
  useAgentVersions,
  useCreateAgentVersion,
  useValidateAgentVersion,
  usePublishAgentVersion,
} from '@hooks/useAgents';
import { useToolList } from '@hooks/useTools';
import { listMemories } from '@api/agentMemory';
import EvalTab from '@components/agents/eval/EvalTab';
import RunsTab from '@components/agents/runs/RunsTab';
import type { AgentSpec, AgentToolPermission } from '@api/agents';
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

/* ---------- Constants ---------- */

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
  const [searchParams] = useSearchParams();

  /* ---------- Real API hooks ---------- */
  const { data: agent, isLoading: agentLoading } = useAgent(agentId ?? null);
  const { data: versions = [] } = useAgentVersions(agentId ?? null);
  // Pick the highest-numbered published version; fall back to highest draft.
  const latestVersion = useMemo(() => {
    if (!versions.length) return undefined;
    const sorted = [...versions].sort((a, b) => b.version - a.version);
    return sorted.find((v) => v.status === 'published') ?? sorted[0];
  }, [versions]);

  const createVersion = useCreateAgentVersion(agentId ?? '');
  const validateVersion = useValidateAgentVersion(agentId ?? '');
  const publishVersion = usePublishAgentVersion(agentId ?? '');

  // Real tool catalog from the registry
  const { data: toolCatalog = [] } = useToolList();

  // Real memory entries for this agent (drives the Memory pipeline card)
  const { data: memories = [] } = useQuery({
    queryKey: ['agentMemories', agentId],
    queryFn: () => listMemories(agentId!),
    enabled: !!agentId,
    staleTime: 60_000,
  });

  /* ---------- Editor state ---------- */
  // Initial tab can be overridden via ?tab=runs|evals|playground from another page.
  const initialTab = searchParams.get('tab') ?? 'builder';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [goal, setGoal] = useState('');
  // LLM weight + provider/model are not part of the v1 AgentSpec (the gateway
  // configures them via env vars). They remain editable knobs but are local-only.
  const [llmWeight, setLlmWeight] = useState(0.7);
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  // selectedToolRefs holds full "tool_id@version" strings — same format as spec.tools[].tool_ref
  const [selectedToolRefs, setSelectedToolRefs] = useState<string[]>([]);
  const [highlightedToolRef, setHighlightedToolRef] = useState<string | null>(null);

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
      if (spec.tools?.length) {
        setSelectedToolRefs(spec.tools.map((t) => t.tool_ref));
      }
    }
  }, [latestVersion]);

  /* ---------- Derived data ---------- */

  // Index of registry tools by full ref (id@currentVersion). Tools without a
  // current version still get an entry keyed by id for fallback lookups.
  const toolByRef = useMemo(() => {
    const map = new Map<string, { id: string; name: string; version: string; permissions: string[]; maxCalls: number }>();
    for (const t of toolCatalog) {
      const ver = t.currentVersion?.replace(/^v/, '') || '0.1.0';
      map.set(`${t.id}@${ver}`, {
        id: t.id,
        name: t.name,
        version: ver,
        permissions: ['read', 'execute'],
        maxCalls: 5,
      });
    }
    return map;
  }, [toolCatalog]);

  // Catalog rows for the picker: every published tool, marked selected/not.
  const catalogRows = useMemo(() => {
    return toolCatalog.map((t) => {
      const ver = t.currentVersion?.replace(/^v/, '') || '0.1.0';
      const ref = `${t.id}@${ver}`;
      return {
        id: t.id,
        ref,
        name: t.name,
        version: ver,
        permissions: ['read', 'execute'],
        maxCalls: 5,
      };
    });
  }, [toolCatalog]);

  // Spec-defined tools (the ones THIS agent actually uses), enriched with
  // catalog metadata for display. Falls back to the bare tool_ref when the
  // tool isn't in the registry list yet.
  const specToolDetails = useMemo(() => {
    const specTools: AgentToolPermission[] = latestVersion?.spec_json?.tools ?? [];
    return specTools.map((t) => {
      const meta = toolByRef.get(t.tool_ref);
      const [id, version] = t.tool_ref.split('@');
      return {
        ref: t.tool_ref,
        id,
        version,
        name: meta?.name ?? id,
        permissions: t.permissions ?? ['execute'],
        maxCalls: t.max_invocations ?? 1,
      };
    });
  }, [latestVersion, toolByRef]);

  // Scoring weights derived from spec.scoring.weights — fall back to the
  // platform default mix if the spec didn't define any.
  const scoringWeights = useMemo(() => {
    const w = latestVersion?.spec_json?.scoring?.weights;
    if (!w) {
      return [
        { label: 'Compatibility', value: 0.5 },
        { label: 'Trust', value: 0.3 },
        { label: 'Cost', value: 0.2 },
      ];
    }
    const out: { label: string; value: number }[] = [];
    if (w.compatibility != null) out.push({ label: 'Compatibility', value: w.compatibility });
    if (w.trust != null) out.push({ label: 'Trust', value: w.trust });
    if (w.cost != null) out.push({ label: 'Cost', value: w.cost });
    if (w.latency != null) out.push({ label: 'Latency', value: w.latency });
    return out;
  }, [latestVersion]);

  // Policy + constraints rules derived from the spec.
  const policyRules = useMemo(() => {
    const spec = latestVersion?.spec_json;
    if (!spec) return [] as string[];
    const rules: string[] = [];
    const p = spec.policy;
    const c = spec.constraints;
    if (p?.auto_approve_threshold != null) {
      rules.push(`Auto-approve candidates above ${p.auto_approve_threshold} confidence.`);
    }
    if (p?.require_approval_for?.length) {
      rules.push(`Require approval for: ${p.require_approval_for.join(', ')}.`);
    }
    if (c?.budget_limit != null) {
      rules.push(`Budget cap: $${c.budget_limit.toFixed(2)} per run.`);
    }
    if (c?.max_tools_per_run != null) {
      rules.push(`Max ${c.max_tools_per_run} tool invocations per run.`);
    }
    if (c?.timeout_seconds != null) {
      rules.push(`Run timeout: ${c.timeout_seconds}s.`);
    }
    if (c?.max_retries != null) {
      rules.push(`Up to ${c.max_retries} retry attempts on failure.`);
    }
    return rules;
  }, [latestVersion]);

  // Recent runs for this agent — drives Performance + Recent Decisions panels.
  const { data: recentRuns = [] } = useQuery<Array<{ id: string; status: string; cost_actual?: number; started_at?: string; completed_at?: string }>>({
    queryKey: ['agentRuns', agentId],
    queryFn: async () => {
      const { apiClient } = await import('@api/client');
      const res = await apiClient.get<{ runs?: Array<Record<string, unknown>> | null }>(`/v0/runs?agent_id=${agentId}&limit=20`);
      return (res.runs ?? []) as Array<{ id: string; status: string; cost_actual?: number; started_at?: string; completed_at?: string }>;
    },
    enabled: !!agentId,
    staleTime: 30_000,
  });

  const performanceStats = useMemo(() => {
    const total = recentRuns.length;
    if (total === 0) {
      return [
        { label: 'Total runs', value: '0' },
        { label: 'Success rate', value: '—' },
        { label: 'Avg cost/run', value: '—' },
      ];
    }
    const succeeded = recentRuns.filter((r) => r.status === 'SUCCEEDED').length;
    const successRate = Math.round((succeeded / total) * 100);
    const totalCost = recentRuns.reduce((sum, r) => sum + (r.cost_actual ?? 0), 0);
    const avgCost = totalCost / total;
    return [
      { label: 'Total runs', value: String(total) },
      { label: 'Success rate', value: `${successRate}%` },
      { label: 'Avg cost/run', value: `$${avgCost.toFixed(4)}` },
    ];
  }, [recentRuns]);

  const recentDecisions = useMemo(() => {
    return recentRuns.slice(0, 5).map((r) => {
      const ts = r.started_at ?? r.completed_at;
      const when = ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      const tone: 'success' | 'danger' = r.status === 'SUCCEEDED' ? 'success' : 'danger';
      return {
        title: r.id,
        confidence: r.status,
        detail: `${when}${r.cost_actual ? ` · $${r.cost_actual.toFixed(4)}` : ''}`,
        tone,
      };
    });
  }, [recentRuns]);

  /* ---------- Action handlers ---------- */

  const handleSaveDraft = async () => {
    const agentName = agent?.name ?? 'agent';
    // metadata.name must match ^[a-z][a-z0-9._-]{2,63}$ — slugify the display name
    const metaName = agentName.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/^[^a-z]/, 'a').slice(0, 63);
    const versionNum = (versions.length + 1).toString() + '.0.0';
    const tools = selectedToolRefs.map((ref) => ({
      tool_ref: ref,
      permissions: ['read', 'execute'] as string[],
      max_invocations: toolByRef.get(ref)?.maxCalls ?? 5,
    }));
    if (tools.length === 0) {
      alert('Select at least one tool before saving.');
      return;
    }
    const spec: AgentSpec = {
      api_version: 'airaie.agentspec/v1',
      kind: 'AgentSpec',
      metadata: {
        name: metaName,
        version: versionNum,
        owner: 'usr_dev_admin',
        domain_tags: ['general'],
        description: goal,
      },
      goal,
      tools,
      scoring: {
        strategy: 'weighted',
        weights: { compatibility: 0.30, trust: 0.25, cost: 0.20, latency: 0.15 },
      },
      constraints: { max_tools_per_run: 15, timeout_seconds: 600, max_retries: 3, budget_limit: 10.0 },
      policy: {
        auto_approve_threshold: 0.35,
        require_approval_for: ['write', 'execute'],
      },
    };
    try {
      await createVersion.mutateAsync(spec);
      alert('Draft saved!');
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

  // Tab clicks: Builder/Playground navigate to real routes; Evals/Runs are
  // in-page sections (no separate route yet) so they just switch local state.
  const handleTabClick = (tabId: string) => {
    if (tabId === 'builder') {
      setActiveTab('builder');
      return;
    }
    if (tabId === 'playground') {
      handleTestInPlayground();
      return;
    }
    // evals + runs: switch local tab; renderer will show a placeholder
    setActiveTab(tabId);
  };

  const handleRunEvals = () => {
    setActiveTab('evals');
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
    { label: `Tools assigned (${specToolDetails.length})`, status: specToolDetails.length > 0 ? 'pass' : 'fail' },
    { label: 'Policy rules set', status: policyRules.length > 0 ? 'pass' : 'warn' },
    { label: 'Evals not run', status: 'warn' as const },
  ] as Array<{ label: string; status: 'pass' | 'fail' | 'warn' }>;

  const passCount = healthChecks.filter((c) => c.status === 'pass').length;

  /* ---------- Tool rows for the pipeline panel (ones in this agent's spec) ---------- */
  const activeToolDefs = specToolDetails;

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
                    onClick={() => handleTabClick(tab.id)}
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

                {/* Policy (derived from spec) */}
                <div className="relative pl-2">
                  <div
                    className="rounded-[16px] border border-[#ece9e3] bg-white px-4 py-4 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.03)]"
                    style={{ borderLeftWidth: 3, borderLeftColor: '#ff9800' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full">
                        <Shield size={15} color="#ff9800" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#1f1f1f]">Policy</p>
                        {(() => {
                          const spec = latestVersion?.spec_json;
                          const lines: string[] = [];
                          if (spec?.policy?.auto_approve_threshold != null) {
                            lines.push(`Auto-approve > ${spec.policy.auto_approve_threshold}`);
                          }
                          if (spec?.constraints?.budget_limit != null) {
                            lines.push(`Budget cap: $${spec.constraints.budget_limit.toFixed(2)}`);
                          }
                          return lines.length > 0 ? (
                            <p className="mt-1 whitespace-pre-line text-[12px] leading-[1.45] text-[#9b978f]">
                              {lines.join('\n')}
                            </p>
                          ) : (
                            <p className="mt-1 text-[12px] text-[#9b978f]">No policy defined</p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Memory (real entry count for this agent) */}
                <div className="relative pl-2">
                  <div
                    className="rounded-[16px] border border-[#ece9e3] bg-white px-4 py-4 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.03)]"
                    style={{ borderLeftWidth: 3, borderLeftColor: '#607d8b' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full">
                        <Database size={15} color="#607d8b" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-[13px] font-semibold text-[#1f1f1f]">Memory</p>
                          <span className="shrink-0 text-[12px] text-[#9b978f]">{memories.length} entries</span>
                        </div>
                        <p className="mt-1 text-[12px] leading-[1.45] text-[#9b978f]">
                          {memories.length === 0 ? 'No memories yet' : `${memories.length} learned items`}
                        </p>
                      </div>
                    </div>
                  </div>
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
              {activeTab === 'evals' && agentId && (
                <div className="space-y-4">
                  <SectionLabel>Evals</SectionLabel>
                  <EvalTab agentId={agentId} />
                </div>
              )}
              {activeTab === 'runs' && (
                <RunsTab
                  runs={recentRuns}
                  agentName={agentName}
                  versionLabel={versionLabel}
                  versionStatus={versionStatus}
                />
              )}
              <div className={cn('space-y-8', activeTab !== 'builder' && 'hidden')}>

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

                    {catalogRows.length === 0 && (
                      <p className="px-4 py-6 text-center text-[13px] text-[#9b978f]">
                        No tools registered yet. Visit <button className="text-[#ad35ff] underline" onClick={() => navigate('/tools')}>Tools</button> to register one.
                      </p>
                    )}
                    {catalogRows.map((tool) => {
                      const isSelected = selectedToolRefs.includes(tool.ref);
                      const isActive = tool.ref === highlightedToolRef;

                      return (
                        <button
                          key={tool.ref}
                          type="button"
                          onClick={() => {
                            setHighlightedToolRef(tool.ref);
                            setSelectedToolRefs((prev) =>
                              prev.includes(tool.ref)
                                ? prev.filter((r) => r !== tool.ref)
                                : [...prev, tool.ref]
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
                              <PermissionPill key={permission}>{permission}</PermissionPill>
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
                      {scoringWeights.map((weight) => (
                        <WeightToken key={weight.label} label={weight.label} value={weight.value} />
                      ))}
                    </div>

                    {(() => {
                      const sum = scoringWeights.reduce((s, w) => s + w.value, 0);
                      const ok = Math.abs(sum - 1.0) < 0.01;
                      return (
                        <p className={cn('mt-4 text-[12px] font-medium', ok ? 'text-[#4caf50]' : 'text-[#ff9800]')}>
                          Weights must sum to 1.0 · Current: {sum.toFixed(2)}
                        </p>
                      );
                    })()}
                  </div>
                </section>

                {/* Policy Rules */}
                <section>
                  <SectionLabel>Policy Rules</SectionLabel>
                  <div className="space-y-3">
                    {policyRules.length === 0 && (
                      <p className="text-[13px] text-[#9b978f]">No policy or constraints set in spec.</p>
                    )}
                    {policyRules.map((rule) => (
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
                  onClick={handleRunEvals}
                  className="inline-flex h-[36px] min-w-[114px] items-center justify-center gap-2 rounded-[11px] border border-[#d87aff] bg-white px-4 text-[12px] font-medium text-[#a43df0] transition-colors hover:bg-[#fcf5ff]"
                >
                  <FlaskConical size={13} strokeWidth={2} />
                  <span>Run Evals</span>
                </button>
                <span className="whitespace-nowrap text-[12px] text-[#8f8a83]">
                  {specToolDetails.length} tools · {policyRules.length} policies · {memories.length} memories
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

              {/* Performance (computed from real runs for this agent) */}
              <section className="border-b border-[#f0ede8] py-5">
                <SectionLabel>Performance</SectionLabel>
                <div className="space-y-2.5 text-[14px]">
                  {performanceStats.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <span className="text-[#8f8a83]">{item.label}</span>
                      <span className={cn(
                        'font-medium text-[#1f1f1f]',
                        item.label === 'Success rate' && item.value !== '—' && 'text-[#4caf50]'
                      )}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent decisions (real runs for this agent) */}
              <section className="border-b border-[#f0ede8] py-5">
                <SectionLabel>Recent Runs</SectionLabel>
                <div className="space-y-4">
                  {recentDecisions.length === 0 && (
                    <p className="text-[13px] text-[#9b978f]">No runs yet for this agent.</p>
                  )}
                  {recentDecisions.map((decision) => (
                    <div key={decision.title} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-[12px] font-medium text-[#1f1f1f] truncate">{decision.title}</p>
                        <span className={cn(
                          'text-[12px] font-medium uppercase',
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
              onClick={handleRunEvals}
              className="inline-flex h-[40px] min-w-[124px] items-center justify-center gap-2 rounded-[12px] border border-[#d87aff] bg-white px-4 text-[14px] font-medium text-[#a43df0]"
            >
              <FlaskConical size={16} />
              <span>Run Evals</span>
            </button>
            <span className="text-[14px] text-[#8f8a83]">{specToolDetails.length} tools · {policyRules.length} policies · {memories.length} memories</span>
          </div>
        </div>

      </div>
    </div>
  );
}
