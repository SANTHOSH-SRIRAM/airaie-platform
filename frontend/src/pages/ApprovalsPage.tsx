import { useEffect, useMemo, useState } from 'react';
import {
  Search, ChevronDown, ChevronRight, Shield, ShieldCheck, ShieldAlert,
  Brain, CheckCircle2, XCircle, Circle, Clock, AlertTriangle,
  Check, X, MessageSquare,
} from 'lucide-react';
import { cn } from '@utils/cn';
import { useUiStore } from '@store/uiStore';
import { useApprovals, useApproveApproval, useRejectApproval } from '@hooks/useApprovals';
import type { Approval, ApprovalType, ApprovalStatus } from '@/types/approval';

// ── Config ───────────────────────────────────────────────────

type TabFilter = 'all' | 'gate' | 'agent_escalation';

const TABS: { value: TabFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'gate', label: 'Gate Approvals' },
  { value: 'agent_escalation', label: 'Agent Escalations' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_STYLES: Record<ApprovalStatus, { bg: string; text: string; dot: string; label: string }> = {
  pending:  { bg: 'bg-[#fff3e0]', text: 'text-[#e65100]', dot: 'bg-[#ff9800]', label: 'Pending' },
  approved: { bg: 'bg-[#e8f5e9]', text: 'text-[#2e7d32]', dot: 'bg-[#4caf50]', label: 'Approved' },
  rejected: { bg: 'bg-[#ffebee]', text: 'text-[#c62828]', dot: 'bg-[#e74c3c]', label: 'Rejected' },
};

const TYPE_CONFIG: Record<ApprovalType, { icon: typeof Shield; color: string; label: string }> = {
  gate:             { icon: ShieldCheck,  color: 'text-[#ff9800]', label: 'Gate' },
  agent_escalation: { icon: Brain,        color: 'text-[#9b2cdd]', label: 'Agent' },
};

// ── Helpers ──────────────────────────────────────────────────

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── StatusPill ───────────────────────────────────────────────

function StatusPill({ status }: { status: ApprovalStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn('inline-flex items-center gap-1 h-[20px] rounded-[6px] px-2 text-[10px] font-medium', s.bg, s.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

// ── Gate Detail Expand ───────────────────────────────────────

function GateDetailExpand({ details }: { details: Record<string, unknown> }) {
  const requirements = (details.requirements ?? []) as {
    id: string;
    description: string;
    satisfied: boolean;
    evidence?: Record<string, unknown>;
  }[];

  return (
    <div className="px-5 py-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#acacac] mb-2">
        Requirements Checklist
      </p>
      <div className="flex flex-col gap-2">
        {requirements.map((req) => (
          <div key={req.id} className="flex items-start gap-2">
            {req.satisfied ? (
              <CheckCircle2 size={14} className="text-[#4caf50] shrink-0 mt-0.5" />
            ) : (
              <Circle size={14} className="text-[#ff9800] shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className={cn('text-[12px]', req.satisfied ? 'text-[#4caf50]' : 'text-[#1a1a1a]')}>
                {req.description}
              </p>
              {req.evidence && (
                <p className="text-[10px] text-[#6b6b6b] mt-0.5">
                  Evidence: {Object.entries(req.evidence).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Agent Detail Expand ──────────────────────────────────────

function AgentDetailExpand({ details }: { details: Record<string, unknown> }) {
  const proposal = details.proposal_summary as string | undefined;
  const confidence = details.confidence as number | undefined;
  const reasoning = details.reasoning as string | undefined;
  const alternatives = (details.alternatives ?? []) as string[];

  const confidenceColor =
    (confidence ?? 0) >= 0.7 ? 'text-[#4caf50]' :
    (confidence ?? 0) >= 0.5 ? 'text-[#ff9800]' :
    'text-[#e74c3c]';

  return (
    <div className="px-5 py-3">
      {/* Proposal */}
      <div className="mb-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#acacac] mb-1">Proposal</p>
        <p className="text-[12px] text-[#1a1a1a]">{proposal}</p>
      </div>

      {/* Confidence + Reasoning */}
      <div className="grid grid-cols-[140px_1fr] gap-4 mb-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#acacac] mb-1">Confidence</p>
          <p className={cn('text-[18px] font-bold', confidenceColor)}>
            {((confidence ?? 0) * 100).toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#acacac] mb-1">Reasoning</p>
          <p className="text-[12px] text-[#6b6b6b] leading-relaxed">{reasoning}</p>
        </div>
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#acacac] mb-1">Alternatives</p>
          <div className="flex flex-col gap-1">
            {alternatives.map((alt, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] text-[#acacac] mt-0.5 shrink-0">{i + 1}.</span>
                <p className="text-[12px] text-[#6b6b6b]">{alt}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Approval Row ─────────────────────────────────────────────

function ApprovalRow({
  approval,
  expanded,
  onToggle,
  onApprove,
  onReject,
  isPending,
}: {
  approval: Approval;
  expanded: boolean;
  onToggle: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  isPending: boolean;
}) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const typeConfig = TYPE_CONFIG[approval.approval_type];
  const TypeIcon = typeConfig.icon;

  return (
    <div className={cn(
      'border-b border-[#f8f8f7] transition-colors',
      expanded && 'bg-[#fbfaf9]',
    )}>
      {/* Main Row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full grid items-center gap-3 px-4 py-3 text-left grid-cols-[20px_24px_minmax(160px,1.4fr)_minmax(120px,1fr)_80px_80px_100px]"
      >
        {/* Expand chevron */}
        <span className="flex items-center justify-center">
          <ChevronRight
            size={14}
            className={cn('text-[#acacac] transition-transform', expanded && 'rotate-90')}
          />
        </span>

        {/* Type icon */}
        <span className="flex items-center justify-center">
          <TypeIcon size={16} className={typeConfig.color} />
        </span>

        {/* Resource name */}
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-[#1a1a1a]">{approval.resource_name}</p>
          <p className="truncate text-[10px] text-[#6b6b6b] mt-0.5">
            <span className={cn('font-medium', typeConfig.color)}>{typeConfig.label}</span>
          </p>
        </div>

        {/* Board name */}
        <span className="text-[11px] text-[#6b6b6b] truncate">{approval.board_name}</span>

        {/* Time */}
        <span className="flex items-center gap-1 text-[10px] text-[#acacac]">
          <Clock size={10} />
          {formatTimeAgo(approval.created_at)}
        </span>

        {/* Status */}
        <StatusPill status={approval.status} />

        {/* Actions */}
        <span
          className="flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {approval.status === 'pending' && (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onApprove(approval.id)}
                className="flex items-center gap-1 px-2 py-1 bg-[#4caf50] text-white text-[10px] font-medium rounded-[6px] hover:bg-[#43a047] transition-colors disabled:opacity-50"
              >
                <Check size={10} /> Approve
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowRejectInput(!showRejectInput)}
                className="flex items-center gap-1 px-2 py-1 border border-[#e74c3c] text-[#e74c3c] text-[10px] font-medium rounded-[6px] hover:bg-[#ffebee] transition-colors disabled:opacity-50"
              >
                <X size={10} /> Reject
              </button>
            </>
          )}
        </span>
      </button>

      {/* Reject reason input */}
      {showRejectInput && approval.status === 'pending' && (
        <div className="px-4 pb-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <MessageSquare size={12} className="text-[#acacac] shrink-0" />
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (optional)..."
            className="flex-1 h-[30px] bg-[#f5f5f0] rounded-[6px] px-3 text-[11px] text-[#1a1a1a] placeholder:text-[#acacac] border-none focus:outline-none focus:ring-1 focus:ring-[#e74c3c]"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              onReject(approval.id, rejectReason || undefined);
              setShowRejectInput(false);
              setRejectReason('');
            }}
            className="px-3 py-1 bg-[#e74c3c] text-white text-[10px] font-medium rounded-[6px] hover:bg-[#d32f2f] transition-colors disabled:opacity-50"
          >
            Confirm Reject
          </button>
          <button
            type="button"
            onClick={() => {
              setShowRejectInput(false);
              setRejectReason('');
            }}
            className="px-2 py-1 text-[10px] text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Rejection reason display */}
      {approval.status === 'rejected' && approval.reject_reason && expanded && (
        <div className="px-5 py-2 border-t border-[#f0f0ec]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#acacac] mb-1">Rejection Reason</p>
          <p className="text-[12px] text-[#e74c3c]">{approval.reject_reason}</p>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[#f0f0ec]">
          {approval.approval_type === 'gate' ? (
            <GateDetailExpand details={approval.details} />
          ) : (
            <AgentDetailExpand details={approval.details} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Stats Row ────────────────────────────────────────────────

function StatsRow({ approvals }: { approvals: Approval[] }) {
  const pending = approvals.filter((a) => a.status === 'pending').length;
  const approved = approvals.filter((a) => a.status === 'approved').length;
  const rejected = approvals.filter((a) => a.status === 'rejected').length;
  const gates = approvals.filter((a) => a.approval_type === 'gate').length;
  const escalations = approvals.filter((a) => a.approval_type === 'agent_escalation').length;

  const stats = [
    { value: String(approvals.length), label: 'total approvals' },
    { value: String(pending), label: 'pending', highlight: pending > 0 },
    { value: String(approved), label: 'approved' },
    { value: String(rejected), label: 'rejected' },
    { value: `${gates} / ${escalations}`, label: 'gates / escalations' },
  ];

  return (
    <div className="grid grid-cols-5 gap-[16px] bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] px-[24px] py-[16px]">
      {stats.map((stat) => (
        <div key={stat.label}>
          <div className={cn('text-[22px] font-bold tracking-tight', stat.highlight ? 'text-[#ff9800]' : 'text-[#1a1a1a]')}>
            {stat.value}
          </div>
          <div className={cn('text-[10px] mt-[2px]', stat.highlight ? 'text-[#ff9800]' : 'text-[#6b6b6b]')}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function ApprovalsPage() {
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);

  useEffect(() => {
    setSidebarContentType('navigation');
    hideBottomBar();
  }, [hideBottomBar, setSidebarContentType]);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queryType = activeTab === 'all' ? undefined : activeTab;
  const queryStatus = statusFilter === 'all' ? undefined : statusFilter;
  const { data } = useApprovals({ status: queryStatus, type: queryType });
  const approveMutation = useApproveApproval();
  const rejectMutation = useRejectApproval();

  const approvals = data?.data ?? [];

  const filtered = useMemo(() => {
    if (!search) return approvals;
    const q = search.toLowerCase();
    return approvals.filter(
      (a) =>
        a.resource_name.toLowerCase().includes(q) ||
        a.board_name.toLowerCase().includes(q),
    );
  }, [approvals, search]);

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="mx-auto w-full max-w-[1116px] px-4 pb-12 pt-0 flex flex-col gap-[12px]">
      {/* ── Header ──────────────────────────────── */}
      <section className="flex items-center h-[60px] bg-white rounded-[12px] px-[20px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] gap-[12px]">
        {/* Title */}
        <div className="flex items-center gap-[8px] shrink-0">
          <Shield size={20} className="text-[#ff9800]" />
          <h1 className="text-[18px] font-bold tracking-tight text-[#1a1a1a]">Approvals</h1>
          <span className="h-[22px] px-[10px] rounded-[8px] bg-[#f0f0ec] text-[11px] font-medium text-[#acacac] flex items-center">
            {approvals.length} total
          </span>
        </div>

        {/* Center controls */}
        <div className="flex-1 flex items-center justify-center gap-[8px]">
          {/* Search */}
          <div className="relative flex items-center h-[36px] bg-[#f5f5f0] rounded-[8px] px-[12px] w-[220px]">
            <Search size={14} className="text-[#acacac] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search approvals..."
              className="bg-transparent border-none text-[12px] ml-[8px] w-full focus:outline-none placeholder:text-[#acacac] text-[#1a1a1a]"
            />
          </div>

          {/* Tab bar */}
          <div className="flex items-center h-[36px] bg-[#f5f5f0] rounded-[8px] p-[3px] gap-[2px]">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'h-[30px] px-[14px] rounded-[6px] text-[12px] transition-colors whitespace-nowrap',
                  activeTab === tab.value
                    ? 'bg-[#2d2d2d] text-white'
                    : 'text-[#6b6b6b]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none flex items-center justify-between h-[36px] px-[12px] pr-[28px] bg-[#f5f5f0] rounded-[8px] text-[12px] text-[#6b6b6b] cursor-pointer focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#acacac] pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ── Pending Alert Banner ────────────────── */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between h-[44px] px-[20px] bg-[#fff8e1] rounded-[10px] border border-[#ffe0b2]">
          <div className="flex items-center gap-[8px]">
            <AlertTriangle size={14} className="text-[#ff9800]" />
            <span className="text-[12px] font-medium text-[#ff9800]">
              {pendingCount} approval{pendingCount > 1 ? 's' : ''} pending your review
            </span>
          </div>
        </div>
      )}

      {/* ── Approvals Table ─────────────────────── */}
      <section className="bg-white rounded-[12px] border border-[#ece9e3] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Table header */}
        <div className="grid items-center gap-3 px-4 py-2.5 border-b border-[#f0f0ec] text-[9px] font-semibold uppercase tracking-[0.08em] text-[#acacac] grid-cols-[20px_24px_minmax(160px,1.4fr)_minmax(120px,1fr)_80px_80px_100px]">
          <span />
          <span>Type</span>
          <span>Resource</span>
          <span>Board</span>
          <span>Time</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {/* Rows */}
        <div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-[60px]">
              <ShieldAlert size={36} strokeWidth={1} className="text-[#d0d0d0] mb-[8px]" />
              <p className="text-[14px] font-medium text-[#1a1a1a]">No pending approvals</p>
              <p className="text-[12px] text-[#6b6b6b] mt-[4px]">
                All approvals have been reviewed or no items match your filters
              </p>
            </div>
          ) : (
            filtered.map((approval) => (
              <ApprovalRow
                key={approval.id}
                approval={approval}
                expanded={expandedId === approval.id}
                onToggle={() =>
                  setExpandedId(expandedId === approval.id ? null : approval.id)
                }
                onApprove={(id) => approveMutation.mutate(id)}
                onReject={(id, reason) => rejectMutation.mutate({ id, reason })}
                isPending={approveMutation.isPending || rejectMutation.isPending}
              />
            ))
          )}
        </div>

        {/* Pagination footer */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#f0f0ec]">
            <span className="text-[10px] text-[#acacac]">
              Showing {filtered.length} / {data?.total ?? filtered.length}
            </span>
            <div className="flex items-center gap-3 text-[10px] text-[#6b6b6b]">
              <button type="button" className="hover:text-[#1a1a1a] transition-colors">
                Previous
              </button>
              <span className="text-[#acacac]">1 / 1</span>
              <button type="button" className="hover:text-[#1a1a1a] transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Stats Row ───────────────────────────── */}
      <StatsRow approvals={approvals} />
    </div>
  );
}
