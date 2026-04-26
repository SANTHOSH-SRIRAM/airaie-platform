import { useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ExternalLink, Play, Eye, GitBranch, DollarSign,
  ChevronRight, Star, Link2,
  Webhook, Zap, Trash2, Settings, Shield, ArrowRight,
  Activity, BarChart3, Timer, CircleDot,
} from 'lucide-react';
import { cn } from '@utils/cn';
import { useUiStore } from '@store/uiStore';
import {
  useWorkflow,
  useWorkflowVersions,
  useWorkflowWithVersions,
  useTriggers,
  useCreateTrigger,
  useUpdateTrigger,
  useDeleteTrigger,
  useRunWorkflow,
  useDeleteWorkflow,
} from '@hooks/useWorkflow';
import { useRunList } from '@hooks/useRuns';
import { decodeDsl, type WorkflowDslNode, type WorkflowDslNodeType } from '@utils/workflowDsl';
import { formatRelativeTime, formatDate } from '@utils/format';
import type { WorkflowVersion, RawWorkflowVersion } from '@api/workflows';
import type { RunEntry } from '@/types/run';
import TriggerPanel from '@components/workflows/TriggerPanel';
import type { WorkflowTrigger } from '@/types/workflow';

// ── Types ────────────────────────────────────────────────────

type RunStatusUi = 'running' | 'succeeded' | 'failed' | 'cancelled' | 'queued';
type NodeTypeUi = 'trigger' | 'tool' | 'agent' | 'gate';

interface RunItem {
  id: string;
  status: RunStatusUi;
  nodes?: string;
  progress?: number;
  failedAt?: string;
  queueMsg?: string;
  duration: string;
  cost: string;
  time: string;
}

interface NodeItem {
  name: string;
  type: NodeTypeUi;
  tags: string[];
  edges: number;
  avgDuration: string;
  note?: string;
}

interface VersionItem {
  version: string;
  status: 'published' | 'active' | 'deprecated' | 'draft' | 'compiled';
  label?: string;
  description: string;
  tags: string[];
  date: string;
}

// ── Mappers ──────────────────────────────────────────────────

function toVersionItem(
  v: WorkflowVersion,
  isLatestPublished: boolean,
): VersionItem {
  // Active = the latest published version. Deprecated = older published.
  let status: VersionItem['status'];
  let description: string;
  if (v.status === 'published') {
    status = isLatestPublished ? 'active' : 'deprecated';
    description = isLatestPublished ? 'Active published version' : 'Previously published version';
  } else if (v.status === 'compiled') {
    status = 'compiled';
    description = 'Compiled (not yet published)';
  } else {
    status = 'draft';
    description = 'Draft version';
  }
  return {
    version: `v${v.version}`,
    status,
    description,
    tags: [],
    date: v.created_at ? formatDate(v.created_at) : '—',
  };
}

function toRunItem(raw: RunEntry): RunItem {
  // Map RunEntry.status (frontend RunStatus) to local UI status.
  const statusMap: Record<string, RunStatusUi> = {
    running: 'running',
    succeeded: 'succeeded',
    failed: 'failed',
    cancelled: 'cancelled',
    waiting: 'queued',
  };
  const status = statusMap[raw.status] ?? 'queued';
  const durStr = raw.duration > 0
    ? raw.duration < 60
      ? `${raw.duration}s`
      : `${Math.floor(raw.duration / 60)}m${raw.duration % 60 ? ` ${raw.duration % 60}s` : ''}`
    : '';
  return {
    id: raw.id,
    status,
    nodes: raw.nodesTotal > 0 ? `${raw.nodesCompleted}/${raw.nodesTotal} nodes` : undefined,
    duration: durStr,
    cost: raw.costUsd > 0 ? `$${raw.costUsd.toFixed(2)}` : '',
    time: raw.startedAt ? formatRelativeTime(raw.startedAt) : '—',
  };
}

const NODE_KIND_TO_UI: Record<WorkflowDslNodeType, NodeTypeUi | null> = {
  trigger: 'trigger',
  tool: 'tool',
  agent: 'agent',
  gate: 'gate',
  logic: 'tool',
  data: 'tool',
  stickyNote: null,
};

function humanizeNodeId(id: string): string {
  return id
    .replace(/^node_\d+_/, '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ') || id;
}

export function toNodeItem(rawNode: WorkflowDslNode, edgeCount: number): NodeItem | null {
  const ui = NODE_KIND_TO_UI[rawNode.type];
  if (!ui) return null;
  const name = rawNode.label || humanizeNodeId(rawNode.id);
  const tags: string[] = [];
  if (rawNode.type === 'tool' && (rawNode as { tool?: string }).tool) {
    tags.push((rawNode as { tool?: string }).tool!);
  }
  if (rawNode.type === 'agent' && (rawNode as { agent?: string }).agent) {
    tags.push((rawNode as { agent?: string }).agent!);
  }
  return {
    name,
    type: ui,
    tags,
    edges: edgeCount,
    avgDuration: '',
  };
}

/**
 * Pick the version to summarize: latest published > highest version.
 * Returns null if no version has a DSL.
 */
export function pickActiveVersion(
  versions: RawWorkflowVersion[] | undefined,
): RawWorkflowVersion | null {
  if (!versions || versions.length === 0) return null;
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  return sorted.find((v) => v.status === 'published') ?? sorted[0] ?? null;
}

/**
 * Derive node summary list from a DSL. Counts outgoing edges per node,
 * preferring the explicit `edges` array but falling back to inverse
 * `depends_on` for legacy workflows.
 */
export function deriveNodeItems(version: RawWorkflowVersion | null): NodeItem[] | 'error' {
  if (!version || !version.dsl) return [];
  const dsl = decodeDsl(version.dsl);
  if (!dsl) return 'error';
  const nodes = dsl.nodes ?? [];
  if (nodes.length === 0) return [];

  // Count outgoing edges per node id.
  const outCount = new Map<string, number>();
  if (dsl.edges && dsl.edges.length > 0) {
    dsl.edges.forEach((e) => {
      outCount.set(e.source, (outCount.get(e.source) ?? 0) + 1);
    });
  } else {
    // Legacy: derive from depends_on (inverse)
    nodes.forEach((n) => {
      (n.depends_on ?? []).forEach((parent) => {
        outCount.set(parent, (outCount.get(parent) ?? 0) + 1);
      });
    });
  }

  return nodes
    .map((n) => toNodeItem(n, outCount.get(n.id) ?? 0))
    .filter((x): x is NodeItem => x !== null);
}

// ── Placeholder data (versions/runs/nodes still backend-pending) ─────

interface WorkflowHeader {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'published' | 'draft';
  tags: string[];
  stats: {
    totalRuns: string;
    successRate: string;
    avgDuration: string;
    avgCost: string;
    activeSince: string;
    lastRun: string;
  };
  owner: string;
  project: string;
}

const EMPTY_STATS: WorkflowHeader['stats'] = {
  totalRuns: '—',
  successRate: '—',
  avgDuration: '—',
  avgCost: '—',
  activeSince: '—',
  lastRun: '—',
};

// ── Status Config ────────────────────────────────────────────

const RUN_STATUS: Record<RunStatusUi, { bg: string; text: string; label: string }> = {
  running:   { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]', label: 'Running' },
  succeeded: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]', label: 'Succeeded' },
  failed:    { bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]', label: 'Failed' },
  cancelled: { bg: 'bg-[#f5f5f0]', text: 'text-[#acacac]', label: 'Cancelled' },
  queued:    { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]', label: 'Queued' },
};

const NODE_TYPE_STYLE: Record<NodeTypeUi, { bg: string; text: string }> = {
  trigger: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
  tool:    { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
  agent:   { bg: 'bg-[#f3e5f9]', text: 'text-[#9c27b0]' },
  gate:    { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
};

// ── Workflow Glyph ───────────────────────────────────────────

function WorkflowGlyph({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="5.5" height="5.5" rx="1.2" stroke="#2196F3" strokeWidth="1.5" />
      <rect x="2" y="16.5" width="5.5" height="5.5" rx="1.2" stroke="#FF9800" strokeWidth="1.5" />
      <rect x="16.5" y="16.5" width="5.5" height="5.5" rx="1.2" stroke="#2196F3" strokeWidth="1.5" />
      <path d="M7.5 4.75H12.5V16.5H16.5" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" opacity="0.25" />
    </svg>
  );
}

// ── Section Header ───────────────────────────────────────────

function SectionHeader({ icon: Icon, title, right }: { icon: typeof Activity; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-[16px]">
      <div className="flex items-center gap-[8px]">
        <Icon size={16} className="text-[#acacac]" />
        <h3 className="text-[14px] font-semibold text-[#1a1a1a]">{title}</h3>
      </div>
      {right}
    </div>
  );
}

// ── Mini DAG Visualization ───────────────────────────────────

function MiniDAG({ workflowId }: { workflowId: string }) {
  const navigate = useNavigate();
  const nodes = [
    { name: 'Webhook', x: 40, color: '#2196f3' },
    { name: 'Mesh Gen', x: 190, color: '#ff9800' },
    { name: 'FEA Solver', x: 340, color: '#ff9800' },
    { name: 'AI Optimizer', x: 490, color: '#9c27b0' },
    { name: 'Gate', x: 620, color: '#4caf50' },
  ];

  return (
    <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[20px] overflow-x-auto">
      <div className="flex items-center justify-between mb-[8px]">
        <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Node Flow Preview</span>
        <button
          onClick={() => navigate(`/workflow-studio/${workflowId}`)}
          className="text-[11px] text-[#2196f3] hover:underline"
        >
          Open full editor &rarr;
        </button>
      </div>
      <svg width="700" height="80" viewBox="0 0 700 80" className="w-full max-w-[700px]">
        {/* Connection lines */}
        {nodes.slice(0, -1).map((n, i) => (
          <line key={i} x1={n.x + 50} y1={40} x2={nodes[i + 1].x} y2={40} stroke="#e8e8e8" strokeWidth="2" strokeDasharray="4 3" />
        ))}
        {/* Nodes */}
        {nodes.map((n) => (
          <g key={n.name}>
            <rect x={n.x} y={20} width={100} height={40} rx={10} fill="white" stroke={n.color} strokeWidth="1.5" />
            <circle cx={n.x + 12} cy={40} r={4} fill={n.color} />
            <text x={n.x + 22} y={44} fontSize="11" fill="#1a1a1a" fontFamily="Inter, sans-serif">{n.name}</text>
          </g>
        ))}
      </svg>
      <div className="flex items-center gap-[6px] mt-[8px] text-[10px] text-[#acacac]">
        <span>5 nodes · 4 edges · last run active</span>
      </div>
    </div>
  );
}

function SkeletonRows({ count = 3, height = 44 }: { count?: number; height?: number }) {
  return (
    <div className="flex flex-col" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-b border-[#fafaf8] last:border-b-0 px-[4px] flex items-center"
          style={{ height }}
        >
          <div className="h-[10px] w-full max-w-[400px] bg-[#f0f0ec] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);

  // useTriggers/useCreateTrigger... all internally enabled-guard on truthy id.
  const workflowId = id ?? '';
  const { data: workflowDetail, isLoading: workflowLoading, error: workflowError } = useWorkflow(workflowId);
  const { data: versionsData, isLoading: versionsLoading, error: versionsError } = useWorkflowVersions(workflowId);
  const { data: envelope, isLoading: envelopeLoading, error: envelopeError } = useWorkflowWithVersions(workflowId);
  const { data: runsData, isLoading: runsLoading, error: runsError } = useRunList(workflowId);
  const { data: triggerEntries } = useTriggers(workflowId);

  // Derive view-models
  const versionItems: VersionItem[] = useMemo(() => {
    const list = versionsData ?? [];
    if (list.length === 0) return [];
    // Latest published = highest version with status='published'
    const sorted = [...list].sort((a, b) => b.version - a.version);
    const latestPub = sorted.find((v) => v.status === 'published');
    return sorted.map((v) => toVersionItem(v, !!latestPub && v.id === latestPub.id));
  }, [versionsData]);

  const runItems: RunItem[] = useMemo(() => {
    const list = runsData ?? [];
    return [...list]
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 10)
      .map(toRunItem);
  }, [runsData]);

  const nodeItemsResult = useMemo(() => {
    const active = pickActiveVersion(envelope?.versions);
    return deriveNodeItems(active);
  }, [envelope]);
  const nodesError = nodeItemsResult === 'error';
  const nodeItems: NodeItem[] = nodesError ? [] : nodeItemsResult;
  const createTriggerMutation = useCreateTrigger(workflowId);
  const updateTriggerMutation = useUpdateTrigger(workflowId);
  const deleteTriggerMutation = useDeleteTrigger(workflowId);
  const runWorkflowMutation = useRunWorkflow(workflowId);
  const deleteWorkflowMutation = useDeleteWorkflow();

  const handleStartRun = useCallback(() => {
    if (!workflowId || runWorkflowMutation.isPending) return;
    runWorkflowMutation.mutate(undefined, {
      onSuccess: ({ runId }) => {
        navigate(`/workflow-runs/${runId}`);
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? 'Failed to start run';
        window.alert(msg);
      },
    });
  }, [workflowId, runWorkflowMutation, navigate]);

  const handleDeleteWorkflow = useCallback(() => {
    if (!workflowId || deleteWorkflowMutation.isPending) return;
    if (!window.confirm('Permanently delete this workflow? This cannot be undone.')) return;
    deleteWorkflowMutation.mutate(workflowId, {
      onSuccess: () => navigate('/workflows'),
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? 'Failed to delete workflow';
        window.alert(msg);
      },
    });
  }, [workflowId, deleteWorkflowMutation, navigate]);

  // Map API trigger entries to WorkflowTrigger shape for TriggerPanel
  const triggers: WorkflowTrigger[] = (triggerEntries ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    config: t.config,
    isEnabled: t.is_enabled,
  }));

  const handleAddTrigger = useCallback(
    (trigger: Omit<WorkflowTrigger, 'id'>) => {
      createTriggerMutation.mutate({
        type: trigger.type,
        config: trigger.config ?? {},
        is_enabled: trigger.isEnabled,
      });
    },
    [createTriggerMutation],
  );

  const handleUpdateTrigger = useCallback(
    (trigger: WorkflowTrigger) => {
      updateTriggerMutation.mutate({
        triggerId: trigger.id,
        data: {
          type: trigger.type,
          config: trigger.config,
          is_enabled: trigger.isEnabled,
        },
      });
    },
    [updateTriggerMutation],
  );

  const handleDeleteTrigger = useCallback(
    (triggerId: string) => {
      deleteTriggerMutation.mutate(triggerId);
    },
    [deleteTriggerMutation],
  );

  useEffect(() => {
    setSidebarContentType('navigation');
    hideBottomBar();
  }, [hideBottomBar, setSidebarContentType]);

  const latestPublishedVersion = (versionsData ?? []).find((v) => v.status === 'published');
  const versionLabel = latestPublishedVersion
    ? `v${latestPublishedVersion.version}`
    : (versionsData && versionsData.length > 0)
      ? `v${Math.max(...versionsData.map((v) => v.version))}`
      : '—';

  const wf: WorkflowHeader = {
    id: workflowDetail?.id ?? workflowId,
    name: workflowDetail?.name ?? (workflowLoading ? 'Loading…' : 'Workflow'),
    description: workflowDetail?.description ?? '',
    version: versionLabel,
    status: latestPublishedVersion ? 'published' : 'draft',
    tags: [
      ...(workflowDetail?.steps?.length ? [`${workflowDetail.steps.length} nodes`] : []),
    ],
    stats: EMPTY_STATS,
    owner: workflowDetail?.ownerName || '—',
    project: workflowDetail?.projectId || '—',
  };
  const s = wf.stats;

  if (workflowError) {
    return (
      <div className="mx-auto w-full max-w-[1116px] px-4 pt-12 text-center">
        <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Workflow not found</h2>
        <p className="mt-2 text-[12px] text-[#6b6b6b]">
          {(workflowError as { message?: string })?.message ?? `Could not load workflow ${workflowId}`}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1116px] px-4 pb-16 pt-0 flex flex-col gap-[16px]">

      {/* ═══════════════════════════════════════════
          TOP BAR
         ═══════════════════════════════════════════ */}
      <section className="flex items-center justify-between h-[48px] bg-white rounded-[12px] px-[16px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-[8px]">
          <WorkflowGlyph size={20} />
          <span className="text-[13px] font-semibold text-[#1a1a1a]">{wf.name}</span>
          <span className="h-[18px] px-[6px] rounded-[4px] bg-[#f0f0ec] text-[9px] font-mono text-[#6b6b6b] flex items-center">{wf.version}</span>
          <span className="h-[18px] px-[8px] rounded-full bg-[#e8f5e9] text-[10px] font-medium text-[#4caf50] flex items-center">Published</span>
          <span className="flex items-center gap-[4px] text-[10px] text-[#4caf50]">
            <span className="w-[5px] h-[5px] rounded-full bg-[#4caf50]" /> Online
          </span>
        </div>
        <div className="flex items-center gap-[8px]">
          <button
            onClick={() => navigate(`/workflow-studio/${workflowId}`)}
            className="h-[30px] px-[14px] rounded-[8px] bg-[#2d2d2d] text-white text-[11px] font-medium flex items-center gap-[6px] hover:bg-[#1a1a1a] transition-colors"
          >
            <ExternalLink size={12} /> Open Editor
          </button>
          <button
            onClick={handleStartRun}
            disabled={runWorkflowMutation.isPending}
            className="h-[30px] px-[14px] rounded-[8px] bg-[#4caf50] text-white text-[11px] font-medium flex items-center gap-[6px] hover:bg-[#43a047] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Play size={12} fill="white" /> {runWorkflowMutation.isPending ? 'Starting…' : 'Start Run'}
          </button>
          <button
            disabled
            title="Deactivate is not yet wired to the backend"
            className="h-[30px] px-[14px] rounded-[8px] border border-[#e8e8e8] text-[11px] font-medium text-[#6b6b6b] flex items-center gap-[6px] hover:bg-[#f5f5f0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Deactivate
          </button>
          <div className="w-[28px] h-[28px] rounded-full bg-[#2d2d2d] flex items-center justify-center text-white text-[11px] font-semibold">S</div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          HERO: Info + Quick Stats
         ═══════════════════════════════════════════ */}
      <section className="grid grid-cols-[1fr_340px] gap-0 bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Left */}
        <div className="p-[24px] border-r border-[#f0f0ec]">
          <div className="flex items-start gap-[12px] mb-[12px]">
            <WorkflowGlyph size={28} />
            <div>
              <h1 className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-tight">{wf.name}</h1>
              <p className="text-[12px] text-[#6b6b6b] mt-[6px] leading-relaxed max-w-[480px]">{wf.description}</p>
            </div>
          </div>
          {/* Tags */}
          <div className="flex items-center gap-[6px] mb-[20px] ml-[40px]">
            {wf.tags.map((tag) => (
              <span key={tag} className="h-[22px] px-[8px] rounded-[4px] bg-[#f5f5f0] text-[10px] text-[#6b6b6b] flex items-center">
                {tag}
              </span>
            ))}
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-[8px] ml-[40px]">
            <button
              onClick={() => navigate(`/workflow-studio/${id || wf.id}`)}
              className="h-[36px] px-[20px] rounded-[8px] bg-[#2d2d2d] text-white text-[12px] font-medium flex items-center gap-[8px] hover:bg-[#1a1a1a] transition-colors"
            >
              <ExternalLink size={14} /> Open Editor
            </button>
            <button
              onClick={() => navigate('/workflow-runs')}
              className="h-[36px] px-[20px] rounded-[8px] border border-[#e8e8e8] text-[12px] font-medium text-[#6b6b6b] flex items-center gap-[8px] hover:bg-[#f5f5f0] transition-colors"
            >
              <Eye size={14} /> View Runs
            </button>
            <button 
              onClick={() => navigate(`/workflows/${id || wf.id}/eval`)}
              className="h-[36px] px-[20px] rounded-[8px] border border-[#d8b4fe] bg-[#f3e8ff] text-[#9333ea] text-[12px] font-bold flex items-center gap-[8px] hover:bg-[#e9d5ff] transition-colors"
            >
              <Activity size={14} /> Evaluation
            </button>
          </div>
        </div>

        {/* Right: Quick Stats */}
        <div className="p-[24px]">
          <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-[12px] block">Quick Stats</span>
          <div className="flex flex-col gap-[10px]">
            {[
              { label: 'Total runs', value: String(s.totalRuns), color: '' },
              { label: 'Success rate', value: `${s.successRate}%`, color: 'text-[#4caf50]' },
              { label: 'Avg Duration', value: s.avgDuration, color: '' },
              { label: 'Avg cost', value: s.avgCost, color: '' },
              { label: 'Active since', value: s.activeSince, color: '' },
              { label: 'Last run', value: s.lastRun, color: 'text-[#4caf50]' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-[11px] text-[#6b6b6b]">{stat.label}</span>
                <span className={cn('text-[12px] font-semibold font-mono', stat.color || 'text-[#1a1a1a]')}>{stat.value}</span>
              </div>
            ))}
          </div>
          {/* Owner / Project */}
          <div className="mt-[16px] pt-[12px] border-t border-[#f0f0ec] flex flex-col gap-[8px]">
            <div className="flex items-center gap-[8px]">
              <div className="w-[20px] h-[20px] rounded-full bg-[#2d2d2d] flex items-center justify-center text-white text-[9px] font-semibold">S</div>
              <span className="text-[11px] text-[#6b6b6b]"><span className="font-medium text-[#1a1a1a]">Santhosh</span> · created Mar 15, 2026</span>
            </div>
            <div className="flex items-center gap-[8px]">
              <GitBranch size={14} className="text-[#acacac]" />
              <span className="text-[11px] text-[#6b6b6b]">{wf.project}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          MINI DAG
         ═══════════════════════════════════════════ */}
      <MiniDAG workflowId={workflowId} />

      {/* ═══════════════════════════════════════════
          STATS CARDS ROW
         ═══════════════════════════════════════════ */}
      <section className="grid grid-cols-4 gap-[12px]">
        {[
          { value: '156', label: 'runs', sub: 'avg 3 / day', icon: BarChart3, color: '#1a1a1a' },
          { value: '94%', label: 'success rate', sub: '147 passed · 9 failed', icon: Star, color: '#ff9800' },
          { value: '42s', label: 'avg duration', sub: 'median 38s', icon: Timer, color: '#1a1a1a' },
          { value: '$288.60', label: 'total cost', sub: 'avg / run $1.85', icon: DollarSign, color: '#1a1a1a' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[20px]">
            <div className="flex items-start justify-between mb-[4px]">
              <span className="text-[24px] font-bold text-[#1a1a1a] tracking-tight font-mono" style={{ color: card.color }}>{card.value}</span>
              <card.icon size={16} className="text-[#d0d0d0] mt-[4px]" />
            </div>
            <span className="text-[11px] text-[#6b6b6b] block">{card.label}</span>
            <span className="text-[10px] text-[#acacac] block mt-[2px]">{card.sub}</span>
          </div>
        ))}
      </section>

      {/* ═══════════════════════════════════════════
          VERSION HISTORY
         ═══════════════════════════════════════════ */}
      <section className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
        <SectionHeader
          icon={GitBranch}
          title="Version History"
          right={
            <div className="flex items-center gap-[12px]">
              <span className="text-[10px] text-[#acacac]">{versionItems.length} version{versionItems.length === 1 ? '' : 's'}</span>
              <button className="text-[11px] text-[#9c27b0] font-medium hover:underline">+ New Version</button>
            </div>
          }
        />
        {versionsLoading ? (
          <SkeletonRows count={3} height={56} />
        ) : versionsError ? (
          <p className="text-[12px] text-[#e74c3c]">Unable to load versions.</p>
        ) : versionItems.length === 0 ? (
          <p className="text-[12px] text-[#6b6b6b]">No versions yet — save the editor to create v1.</p>
        ) : (
        <div className="relative pl-[24px] border-l-[2px] border-[#f0f0ec] ml-[7px] flex flex-col gap-[24px]">
          {versionItems.map((ver) => {
            const isActive = ver.status === 'active';
            const isDeprecated = ver.status === 'deprecated';
            return (
              <div key={ver.version} className="relative">
                {/* Timeline dot */}
                <div className={cn(
                  'absolute -left-[31px] top-[2px] w-[12px] h-[12px] rounded-full border-[2px]',
                  isActive ? 'bg-[#9c27b0] border-[#9c27b0]' : isDeprecated ? 'bg-[#d0d0d0] border-[#d0d0d0]' : 'bg-white border-[#acacac]'
                )} />

                {/* Content */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-[6px] mb-[4px]">
                      <span className="text-[13px] font-semibold text-[#1a1a1a]">{ver.version}</span>
                      {isActive && (
                        <>
                          <span className="h-[18px] px-[6px] rounded-full bg-[#f3e5f9] text-[9px] font-medium text-[#9c27b0] flex items-center">Published</span>
                          <span className="h-[18px] px-[6px] rounded-full bg-[#e8f5e9] text-[9px] font-medium text-[#4caf50] flex items-center">Active</span>
                        </>
                      )}
                      {ver.status === 'published' && !isActive && (
                        <span className="h-[18px] px-[6px] rounded-full bg-[#f5f5f0] text-[9px] font-medium text-[#6b6b6b] flex items-center">Published</span>
                      )}
                      {isDeprecated && (
                        <span className="h-[18px] px-[6px] rounded-full bg-[#f5f5f0] text-[9px] font-medium text-[#acacac] flex items-center">Deprecated</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#6b6b6b] mb-[6px]">{ver.description}</p>
                    {ver.tags.length > 0 && (
                      <div className="flex items-center gap-[4px]">
                        {ver.tags.map((tag) => (
                          <span key={tag} className="h-[20px] px-[8px] rounded-[4px] bg-[#f5f5f0] text-[9px] text-[#6b6b6b] flex items-center font-mono">{tag}</span>
                        ))}
                      </div>
                    )}
                    {isDeprecated && <button className="text-[11px] text-[#2196f3] hover:underline mt-[4px]">View</button>}
                  </div>
                  <span className="text-[10px] text-[#acacac] shrink-0">{ver.date}</span>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════
          RECENT RUNS
         ═══════════════════════════════════════════ */}
      <section className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
        <SectionHeader
          icon={Play}
          title="Recent Runs"
          right={
            <button
              onClick={() => navigate('/workflow-runs')}
              className="text-[11px] text-[#2196f3] font-medium hover:underline flex items-center gap-[4px]"
            >
              View all runs <ArrowRight size={12} />
            </button>
          }
        />
        {runsLoading ? (
          <SkeletonRows count={3} />
        ) : runsError ? (
          <p className="text-[12px] text-[#e74c3c]">Unable to load runs.</p>
        ) : runItems.length === 0 ? (
          <p className="text-[12px] text-[#6b6b6b]">No runs yet — click Run to start.</p>
        ) : (
        <div className="flex flex-col">
          {runItems.map((run) => {
            const cfg = RUN_STATUS[run.status];
            return (
              <div
                key={run.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/workflow-runs/${run.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/workflow-runs/${run.id}`); }}
                className="flex items-center gap-[12px] h-[44px] border-b border-[#fafaf8] last:border-b-0 px-[4px] cursor-pointer hover:bg-[#fafaf8]"
              >
                {/* Status dot */}
                <CircleDot size={14} className={cfg.text} />
                {/* Run ID */}
                <span className="text-[11px] font-mono text-[#1a1a1a] w-[90px] shrink-0">{run.id}</span>
                {/* Status badge */}
                <span className={cn('h-[20px] px-[8px] rounded-[4px] text-[10px] font-medium flex items-center', cfg.bg, cfg.text)}>
                  {cfg.label}
                </span>
                {/* Progress / Error / Queue */}
                <div className="flex-1 min-w-0">
                  {run.status === 'running' && run.progress && (
                    <div className="flex items-center gap-[8px]">
                      <div className="h-[4px] flex-1 max-w-[200px] bg-[#e8e8e8] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2196f3] rounded-full" style={{ width: `${run.progress}%` }} />
                      </div>
                      <span className="text-[10px] text-[#6b6b6b]">{run.nodes}</span>
                    </div>
                  )}
                  {run.status === 'succeeded' && run.nodes && (
                    <span className="text-[10px] text-[#acacac]">{run.nodes}</span>
                  )}
                  {run.failedAt && (
                    <span className="text-[10px] text-[#e74c3c]">{run.failedAt}</span>
                  )}
                  {run.queueMsg && (
                    <span className="text-[10px] text-[#ff9800]">{run.queueMsg}</span>
                  )}
                </div>
                {/* Duration */}
                <span className="text-[10px] font-mono text-[#6b6b6b] w-[50px] text-right shrink-0">{run.duration}</span>
                {/* Cost */}
                <span className="text-[10px] font-mono text-[#6b6b6b] w-[45px] text-right shrink-0">{run.cost || '—'}</span>
                {/* Time */}
                <span className="text-[10px] text-[#acacac] w-[65px] text-right shrink-0">{run.time}</span>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════
          NODE BREAKDOWN
         ═══════════════════════════════════════════ */}
      <section className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
        <SectionHeader icon={Activity} title="Node Breakdown" right={<span className="text-[10px] text-[#acacac]">{nodeItems.length} node{nodeItems.length === 1 ? '' : 's'}</span>} />
        {envelopeLoading ? (
          <SkeletonRows count={3} />
        ) : envelopeError ? (
          <p className="text-[12px] text-[#e74c3c]">Unable to load workflow envelope.</p>
        ) : nodesError ? (
          <p className="text-[12px] text-[#6b6b6b]">Unable to load nodes.</p>
        ) : nodeItems.length === 0 ? (
          <p className="text-[12px] text-[#6b6b6b]">No nodes yet — open the editor to add nodes.</p>
        ) : (
        <div className="flex flex-col">
          {nodeItems.map((node) => {
            const style = NODE_TYPE_STYLE[node.type];
            return (
              <div key={node.name} className="flex items-center gap-[12px] h-[44px] border-b border-[#fafaf8] last:border-b-0 px-[4px]">
                {/* Icon */}
                {node.type === 'trigger' && <Webhook size={14} className={style.text} />}
                {node.type === 'tool' && <Settings size={14} className={style.text} />}
                {node.type === 'agent' && <Zap size={14} className={style.text} />}
                {node.type === 'gate' && <Shield size={14} className={style.text} />}

                {/* Name */}
                <span className="text-[12px] font-medium text-[#1a1a1a] w-[130px] shrink-0">{node.name}</span>

                {/* Type badge */}
                <span className={cn('h-[18px] px-[6px] rounded-[4px] text-[9px] font-medium flex items-center capitalize', style.bg, style.text)}>
                  {node.type}
                </span>

                {/* Tags */}
                <div className="flex items-center gap-[4px] flex-1 min-w-0">
                  {node.tags.map((tag) => (
                    <span key={tag} className="h-[18px] px-[6px] rounded-[4px] bg-[#f5f5f0] text-[9px] text-[#6b6b6b] flex items-center font-mono truncate">{tag}</span>
                  ))}
                </div>

                {/* Edges */}
                <span className="text-[10px] text-[#acacac] w-[50px] shrink-0">{node.edges} edge{node.edges !== 1 ? 's' : ''}</span>

                {/* Duration */}
                <span className="text-[10px] font-mono text-[#6b6b6b] w-[70px] text-right shrink-0">{node.avgDuration || '—'}</span>

                {/* Note */}
                {node.note && (
                  <span className="text-[9px] text-[#ff9800] italic max-w-[200px] truncate shrink-0">{node.note}</span>
                )}
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════
          TRIGGERS
         ═══════════════════════════════════════════ */}
      <section className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
        <TriggerPanel
          workflowId={workflowId}
          triggers={triggers}
          onAdd={handleAddTrigger}
          onUpdate={handleUpdateTrigger}
          onDelete={handleDeleteTrigger}
          isSaving={createTriggerMutation.isPending || updateTriggerMutation.isPending || deleteTriggerMutation.isPending}
        />
      </section>

      {/* ═══════════════════════════════════════════
          LINKED RESOURCES
         ═══════════════════════════════════════════ */}
      <section className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
        <SectionHeader icon={Link2} title="Linked Resources" />
        <div className="grid grid-cols-3 gap-[16px]">
          {/* Boards */}
          <div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[8px]">Boards</span>
            <div className="flex items-center gap-[8px] h-[36px] px-[12px] rounded-[8px] bg-[#f5f5f0]">
              <Shield size={12} className="text-[#ff9800]" />
              <span className="text-[11px] text-[#1a1a1a]">Structural Validation Study</span>
              <ChevronRight size={12} className="text-[#acacac] ml-auto" />
            </div>
            <button className="text-[10px] text-[#2196f3] mt-[6px] hover:underline">+ Link Board</button>
          </div>
          {/* Agents Used */}
          {/* TODO(backend): list real agents bound to this workflow via /v0/workflows/{id}/agents (or wherever the binding lives). Hidden until then to avoid fake data. */}
          {/* Tools Used */}
          <div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[8px]">Tools Used</span>
            <div className="flex flex-col gap-[4px]">
              {['Mesh Generator', 'FEA Solver', 'Result Analyzer'].map((tool) => (
                <div key={tool} className="flex items-center gap-[6px]">
                  <span className="w-[4px] h-[4px] rounded-full bg-[#ff9800]" />
                  <span className="text-[11px] text-[#6b6b6b]">{tool}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          WORKFLOW SETTINGS
         ═══════════════════════════════════════════ */}
      <section className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
        <SectionHeader
          icon={Settings}
          title="Workflow Settings"
          right={<button className="text-[11px] text-[#2196f3] font-medium hover:underline">Edit</button>}
        />
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-[24px]">
          {/* Left col */}
          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b6b6b]">Execution model</span>
              <div className="flex items-center gap-[4px]">
                <span className="text-[11px] font-mono font-medium text-[#1a1a1a]">Async</span>
                <span className="h-[16px] px-[5px] rounded-[3px] bg-[#f5f5f0] text-[8px] text-[#acacac] flex items-center">STATIC</span>
                <span className="text-[10px] text-[#acacac]">4 pipeline(s)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b6b6b]">Auto approve runs</span>
              <div className="w-[32px] h-[16px] rounded-full bg-[#4caf50] relative cursor-pointer">
                <div className="absolute right-[2px] top-[2px] w-[12px] h-[12px] rounded-full bg-white" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b6b6b]">Auto-retry on failure</span>
              <div className="w-[32px] h-[16px] rounded-full bg-[#4caf50] relative cursor-pointer">
                <div className="absolute right-[2px] top-[2px] w-[12px] h-[12px] rounded-full bg-white" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b6b6b]">Max retries</span>
              <span className="text-[11px] font-mono font-medium text-[#1a1a1a]">3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b6b6b]">Timeout / max effort</span>
              <span className="text-[11px] font-mono font-medium text-[#1a1a1a]">600s</span>
            </div>
          </div>

          {/* Middle col */}
          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#acacac]">On success</span>
              <span className="text-[11px] text-[#6b6b6b]">No action(s)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#acacac]">On failure</span>
              <span className="text-[11px] text-[#6b6b6b]">On failure</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#acacac]">On gate passing</span>
              <span className="text-[11px] text-[#6b6b6b]">On gate passing</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#acacac]">Email alerts</span>
              <span className="text-[11px] text-[#6b6b6b]">Notify</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#acacac]">YAML</span>
              <span className="text-[11px] text-[#6b6b6b]">Auto</span>
            </div>
          </div>

          {/* Right col */}
          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center gap-[8px]">
              <div className="w-[28px] h-[28px] rounded-full bg-[#2d2d2d] flex items-center justify-center text-white text-[11px] font-semibold">S</div>
              <span className="text-[12px] font-medium text-[#1a1a1a]">Santhosh</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          DELETE WORKFLOW (Danger Zone)
         ═══════════════════════════════════════════ */}
      <section className="bg-[#fef8f7] rounded-[12px] border border-[#f5c6cb] p-[24px]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-[#e74c3c] mb-[4px]">Delete Workflow</h3>
            <p className="text-[11px] text-[#6b6b6b] max-w-[500px]">
              Permanently delete this workflow and all its versions. Active triggers will be deactivated. Existing run history will be preserved.
            </p>
          </div>
          <button
            onClick={handleDeleteWorkflow}
            disabled={deleteWorkflowMutation.isPending}
            className="h-[36px] px-[18px] rounded-[8px] bg-[#e74c3c] text-white text-[12px] font-semibold flex items-center gap-[6px] hover:bg-[#c62828] transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} /> {deleteWorkflowMutation.isPending ? 'Deleting…' : 'Delete Workflow'}
          </button>
        </div>
      </section>
    </div>
  );
}
