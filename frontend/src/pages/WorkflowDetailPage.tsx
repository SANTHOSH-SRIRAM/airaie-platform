import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ExternalLink, Play, Eye, GitBranch, DollarSign,
  ChevronRight, Star, Link2,
  Webhook, Zap, Trash2, Settings, Shield, ArrowRight,
  Activity, BarChart3, Timer, CircleDot,
} from 'lucide-react';
import { cn } from '@utils/cn';
import { useUiStore } from '@store/uiStore';
import { useTriggers, useCreateTrigger, useUpdateTrigger, useDeleteTrigger } from '@hooks/useWorkflow';
import TriggerPanel from '@components/workflows/TriggerPanel';
import type { WorkflowTrigger } from '@/types/workflow';

// ── Types ────────────────────────────────────────────────────

type RunStatus = 'running' | 'succeeded' | 'failed' | 'cancelled' | 'queued';
type NodeType = 'trigger' | 'tool' | 'agent' | 'gate';

interface RunItem {
  id: string;
  status: RunStatus;
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
  type: NodeType;
  tags: string[];
  edges: number;
  avgDuration: string;
  note?: string;
}

interface VersionItem {
  version: string;
  status: 'published' | 'active' | 'deprecated';
  label?: string;
  description: string;
  tags: string[];
  date: string;
}

// ── Mock Data ────────────────────────────────────────────────

const WORKFLOW = {
  id: 'wf_fea_validation',
  name: 'FEA Validation Pipeline',
  description: 'End-to-end finite-element analysis stress validation pipeline with automated mesh generation, FEA simulation, and evidence gating for structural compliance under ISO 13849.',
  version: 'v3',
  status: 'published' as const,
  tags: ['Engineering', '5 nodes', 'Webhook trigger', 'ISO 13849'],
  stats: {
    totalRuns: 156,
    successRate: 94,
    avgDuration: '42s',
    avgCost: '$1.85',
    activeSince: 'Mar 30, 2026',
    lastRun: '2 min ago',
  },
  owner: 'Santhosh',
  project: 'Default Project',
};

const VERSIONS: VersionItem[] = [
  {
    version: 'v3',
    status: 'active',
    label: 'Active',
    description: 'Added Evidence Gate node and AI Optimizer agent integration',
    tags: ['Gate node', 'diff path v1'],
    date: 'Mar 28, 2026',
  },
  {
    version: 'v2',
    status: 'published',
    description: 'Upgraded FEA Solver to v2.1 with nonlinear support',
    tags: ['Solver minor', 'diff path v1'],
    date: 'Mar 23, 2026',
  },
  {
    version: 'v1',
    status: 'deprecated',
    description: 'Initial release with basic 3-node pipeline',
    tags: [],
    date: 'Mar 15, 2026',
  },
];

const RUNS: RunItem[] = [
  { id: 'run_a1b2c3', status: 'running', nodes: '5/5 nodes', progress: 60, duration: '11..31', cost: '', time: '2m ago' },
  { id: 'run_x4k9d8', status: 'succeeded', nodes: '156 nodes', duration: '34..12', cost: '$1.24', time: '5m ago' },
  { id: 'run_d3f5g6', status: 'failed', failedAt: 'Failed at FEA Solver', duration: '11..16', cost: '$1.05', time: '3 hrs' },
  { id: 'run_p2r5t9', status: 'succeeded', duration: '11..41', cost: '', time: '1d ago' },
  { id: 'run_b7f9p2', status: 'cancelled', duration: '41..21', cost: '', time: '2d ago' },
  { id: 'run_c2d4f5', status: 'queued', queueMsg: 'Queue: approval pending', duration: '', cost: '', time: 'Yesterday' },
];

const NODES: NodeItem[] = [
  { name: 'Webhook', type: 'trigger', tags: ['HTTPS', 'POST /v0/...'], edges: 1, avgDuration: '4,200ms' },
  { name: 'Mesh Generator', type: 'tool', tags: ['70th-11r0127.1'], edges: 1, avgDuration: '7,200ms' },
  { name: 'FEA Solver', type: 'tool', tags: ['70th-v1d05ff_1'], edges: 1, avgDuration: '14,000ms', note: 'Longest runtime; may be improved' },
  { name: 'AI Optimizer', type: 'agent', tags: ['TASK-LINECV'], edges: 1, avgDuration: '1,790ms' },
  { name: 'Evidence Gate', type: 'gate', tags: ['0 requirements'], edges: 1, avgDuration: '' },
];

// ── Status Config ────────────────────────────────────────────

const RUN_STATUS: Record<RunStatus, { bg: string; text: string; label: string }> = {
  running:   { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]', label: 'Running' },
  succeeded: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]', label: 'Succeeded' },
  failed:    { bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]', label: 'Failed' },
  cancelled: { bg: 'bg-[#f5f5f0]', text: 'text-[#acacac]', label: 'Cancelled' },
  queued:    { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]', label: 'Queued' },
};

const NODE_TYPE_STYLE: Record<NodeType, { bg: string; text: string }> = {
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

function MiniDAG() {
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
        <button className="text-[11px] text-[#2196f3] hover:underline">Open full editor &rarr;</button>
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

// ── Main Page ────────────────────────────────────────────────

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);

  const workflowId = id ?? 'wf_fea_validation';
  const { data: triggerEntries } = useTriggers(workflowId);
  const createTriggerMutation = useCreateTrigger(workflowId);
  const updateTriggerMutation = useUpdateTrigger(workflowId);
  const deleteTriggerMutation = useDeleteTrigger(workflowId);

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

  const wf = WORKFLOW;
  const s = wf.stats;

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
          <button className="h-[30px] px-[14px] rounded-[8px] bg-[#2d2d2d] text-white text-[11px] font-medium flex items-center gap-[6px] hover:bg-[#1a1a1a] transition-colors">
            <ExternalLink size={12} /> Open Editor
          </button>
          <button className="h-[30px] px-[14px] rounded-[8px] bg-[#4caf50] text-white text-[11px] font-medium flex items-center gap-[6px] hover:bg-[#43a047] transition-colors">
            <Play size={12} fill="white" /> Start Run
          </button>
          <button className="h-[30px] px-[14px] rounded-[8px] border border-[#e8e8e8] text-[11px] font-medium text-[#6b6b6b] flex items-center gap-[6px] hover:bg-[#f5f5f0] transition-colors">
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
            <button className="h-[36px] px-[20px] rounded-[8px] border border-[#e8e8e8] text-[12px] font-medium text-[#6b6b6b] flex items-center gap-[8px] hover:bg-[#f5f5f0] transition-colors">
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
      <MiniDAG />

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
              <span className="text-[10px] text-[#acacac]">3 versions</span>
              <button className="text-[11px] text-[#9c27b0] font-medium hover:underline">+ New Version</button>
            </div>
          }
        />
        <div className="relative pl-[24px] border-l-[2px] border-[#f0f0ec] ml-[7px] flex flex-col gap-[24px]">
          {VERSIONS.map((ver) => {
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
      </section>

      {/* ═══════════════════════════════════════════
          RECENT RUNS
         ═══════════════════════════════════════════ */}
      <section className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
        <SectionHeader
          icon={Play}
          title="Recent Runs"
          right={<button className="text-[11px] text-[#2196f3] font-medium hover:underline flex items-center gap-[4px]">View all 156 runs <ArrowRight size={12} /></button>}
        />
        <div className="flex flex-col">
          {RUNS.map((run) => {
            const cfg = RUN_STATUS[run.status];
            return (
              <div key={run.id} className="flex items-center gap-[12px] h-[44px] border-b border-[#fafaf8] last:border-b-0 px-[4px]">
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
      </section>

      {/* ═══════════════════════════════════════════
          NODE BREAKDOWN
         ═══════════════════════════════════════════ */}
      <section className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
        <SectionHeader icon={Activity} title="Node Breakdown" right={<span className="text-[10px] text-[#acacac]">5 nodes</span>} />
        <div className="flex flex-col">
          {NODES.map((node) => {
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
          <div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] block mb-[8px]">Agents Used</span>
            <div className="flex items-center gap-[8px] h-[36px] px-[12px] rounded-[8px] bg-[#f5f5f0]">
              <Zap size={12} className="text-[#9c27b0]" />
              <span className="text-[11px] text-[#1a1a1a]">FEA Optimizer Agent</span>
              <ChevronRight size={12} className="text-[#acacac] ml-auto" />
            </div>
          </div>
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
          <button className="h-[36px] px-[18px] rounded-[8px] bg-[#e74c3c] text-white text-[12px] font-semibold flex items-center gap-[6px] hover:bg-[#c62828] transition-colors shrink-0">
            <Trash2 size={14} /> Delete Workflow
          </button>
        </div>
      </section>
    </div>
  );
}
