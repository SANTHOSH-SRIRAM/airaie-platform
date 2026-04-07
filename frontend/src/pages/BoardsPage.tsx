import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronDown, Plus, MoreHorizontal, AlertTriangle,
  Shield, Link2, CheckCircle2, Circle, XCircle, Sparkles, Rocket,
} from 'lucide-react';
import { cn } from '@utils/cn';
import { useUiStore } from '@store/uiStore';
import CreateFromIntentModal from '@components/boards/CreateFromIntentModal';

// ── Types ────────────────────────────────────────────────────

type BoardType = 'study' | 'explore' | 'release';
type GateStatus = 'passed' | 'pending' | 'blocked';
type CardStatus = 'complete' | 'running' | 'pending';
type TypeFilter = 'all' | BoardType;

interface GateItem {
  name: string;
  fulfilled: number;
  total: number;
  status: GateStatus;
}

interface CardItem {
  name: string;
  status: CardStatus;
}

interface BoardData {
  id: string;
  name: string;
  type: BoardType;
  tags: string[];
  cards: CardItem[];
  gates: GateItem[];
  readiness: number;
  evidence: { records: number; artifacts: string; approvals: string };
  created: string;
  linkedResources?: string[];
}

// ── Mock Data ────────────────────────────────────────────────

const BOARDS: BoardData[] = [
  {
    id: 'board_structural',
    name: 'Structural Validation Study',
    type: 'study',
    tags: ['Engineering', 'Structural'],
    cards: [
      { name: 'FEA Stress Test', status: 'complete' },
      { name: 'CFD Flow Analysis', status: 'running' },
      { name: 'Fatigue Analysis', status: 'complete' },
      { name: 'DFM Check', status: 'pending' },
    ],
    gates: [
      { name: 'Structural Evidence', fulfilled: 3, total: 3, status: 'passed' },
      { name: 'Thermal Evidence', fulfilled: 1, total: 3, status: 'pending' },
      { name: 'Fatigue Validation', fulfilled: 2, total: 2, status: 'passed' },
      { name: 'Release Approval', fulfilled: 0, total: 0, status: 'blocked' },
    ],
    readiness: 65,
    evidence: { records: 6, artifacts: '3 · 12.4 MB', approvals: '1 pending' },
    created: 'Mar 25',
  },
  {
    id: 'board_thermal',
    name: 'Thermal Analysis Board',
    type: 'explore',
    tags: ['Engineering', 'Thermal'],
    cards: [
      { name: 'Heat Transfer Study', status: 'pending' },
      { name: 'Thermal Cycling Test', status: 'pending' },
    ],
    gates: [
      { name: 'Thermal Evidence', fulfilled: 0, total: 2, status: 'pending' },
      { name: 'Review Gate', fulfilled: 0, total: 1, status: 'pending' },
    ],
    readiness: 0,
    evidence: { records: 1, artifacts: '0', approvals: 'None pending' },
    created: 'Mar 29',
    linkedResources: ['CFD Analysis Flow'],
  },
];

// ── Config ───────────────────────────────────────────────────

const TYPE_COLORS: Record<BoardType, { bg: string; text: string; border: string }> = {
  study:   { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]', border: 'border-l-[#ff9800]' },
  explore: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]', border: 'border-l-[#2196f3]' },
  release: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]', border: 'border-l-[#4caf50]' },
};

const CARD_STATUS_CONFIG: Record<CardStatus, { text: string; color: string; dot: string }> = {
  complete: { text: 'Complete', color: 'text-[#4caf50]', dot: 'bg-[#4caf50]' },
  running:  { text: 'Running',  color: 'text-[#2196f3]', dot: 'bg-[#2196f3]' },
  pending:  { text: 'Pending',  color: 'text-[#acacac]', dot: 'bg-[#d0d0d0]' },
};

const GATE_STATUS_ICON: Record<GateStatus, { icon: typeof CheckCircle2; color: string }> = {
  passed:  { icon: CheckCircle2, color: 'text-[#4caf50]' },
  pending: { icon: Circle,       color: 'text-[#ff9800]' },
  blocked: { icon: XCircle,      color: 'text-[#e74c3c]' },
};

const FILTER_TABS: { value: TypeFilter; label: string; color?: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'explore', label: 'Explore', color: 'text-[#2196f3]' },
  { value: 'study', label: 'Study', color: 'text-[#ff9800]' },
  { value: 'release', label: 'Release', color: 'text-[#4caf50]' },
];

// ── Governance Shield Icon ───────────────────────────────────

function GovernanceIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2L4 6v5c0 5.25 3.4 10.15 8 11.25C16.6 21.15 20 16.25 20 11V6l-8-4z"
        stroke="#ff9800"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// ── Board Card Component ─────────────────────────────────────

function BoardCard({ board }: { board: BoardData }) {
  const navigate = useNavigate();
  const typeStyle = TYPE_COLORS[board.type];
  const passedGates = board.gates.filter((g) => g.status === 'passed').length;

  return (
    <div
      onClick={() => navigate(`/boards/${board.id}`)}
      className={cn(
        'bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] overflow-hidden border-l-[4px] cursor-pointer hover:shadow-[0px_3px_16px_0px_rgba(0,0,0,0.12)] transition-shadow',
        typeStyle.border
      )}>
      <div className="grid grid-cols-[1fr_1fr_1fr] min-h-[200px]">
        {/* ── Left: Info ─────────────────────────── */}
        <div className="p-[20px] flex flex-col">
          {/* Title row */}
          <div className="flex items-start justify-between mb-[10px]">
            <div className="flex items-center gap-[8px]">
              <GovernanceIcon size={20} />
              <h3 className="text-[15px] font-semibold text-[#1a1a1a] tracking-tight">{board.name}</h3>
            </div>
            <div className="flex items-center gap-[6px] shrink-0 ml-[8px]">
              <span className={cn('h-[22px] px-[10px] rounded-[6px] text-[11px] font-medium flex items-center capitalize', typeStyle.bg, typeStyle.text)}>
                {board.type}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/boards/${board.id}/release`);
                }}
                className="w-[24px] h-[24px] flex items-center justify-center rounded-[6px] text-[#4caf50] hover:bg-[#e8f5e9] transition-colors"
                title="Release Packet"
              >
                <Rocket size={14} />
              </button>
              <button className="w-[24px] h-[24px] flex items-center justify-center rounded-[6px] text-[#acacac] hover:text-[#6b6b6b] hover:bg-[#f5f5f0] transition-colors">
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-[6px] mb-[16px]">
            {board.tags.map((tag) => (
              <span key={tag} className={cn(
                'h-[22px] px-[8px] rounded-[4px] text-[10px] font-medium flex items-center border',
                tag === 'Engineering' ? 'border-[#ff9800] text-[#ff9800] bg-white' : 'border-[#e8e8e8] text-[#6b6b6b] bg-white'
              )}>
                {tag}
              </span>
            ))}
          </div>

          {/* Cards */}
          <div className="mb-[12px]">
            <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-[8px] block">Cards</span>
            <div className="flex flex-col gap-[8px]">
              {board.cards.map((card) => {
                const cfg = CARD_STATUS_CONFIG[card.status];
                return (
                  <div key={card.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-[8px]">
                      <span className={cn('w-[6px] h-[6px] rounded-full shrink-0', cfg.dot)} />
                      <span className="text-[12px] text-[#1a1a1a]">{card.name}</span>
                    </div>
                    <span className={cn('text-[11px] font-medium', cfg.color)}>{cfg.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linked Resources */}
          {board.linkedResources && board.linkedResources.length > 0 && (
            <div className="mt-auto pt-[8px]">
              <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-[6px] block">Linked Resources</span>
              {board.linkedResources.map((res) => (
                <div key={res} className="flex items-center gap-[6px]">
                  <Link2 size={11} className="text-[#acacac]" />
                  <span className="text-[11px] text-[#6b6b6b]">{res}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Middle: Gate Status ─────────────────── */}
        <div className="p-[20px] border-l border-[#f0f0ec]">
          <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-[12px] block">Gate Status</span>
          <div className="flex flex-col gap-[10px]">
            {board.gates.map((gate) => {
              const cfg = GATE_STATUS_ICON[gate.status];
              const GateIcon = cfg.icon;
              const reqText = gate.status === 'blocked'
                ? 'Blocked'
                : `${gate.fulfilled}/${gate.total} requirements`;
              const reqColor = gate.status === 'passed'
                ? 'text-[#4caf50]'
                : gate.status === 'blocked'
                  ? 'text-[#e74c3c]'
                  : 'text-[#ff9800]';
              return (
                <div key={gate.name} className={cn(
                  'flex items-start gap-[8px] p-[10px] rounded-[8px] border-l-[3px]',
                  gate.status === 'passed' && 'bg-[#f8fdf8] border-l-[#4caf50]',
                  gate.status === 'pending' && 'bg-[#fffdf5] border-l-[#ff9800]',
                  gate.status === 'blocked' && 'bg-[#fef8f7] border-l-[#e74c3c]',
                )}>
                  <GateIcon size={14} className={cn('shrink-0 mt-[1px]', cfg.color)} />
                  <div>
                    <span className="text-[12px] font-medium text-[#1a1a1a] block">{gate.name}</span>
                    <span className={cn('text-[10px]', reqColor)}>{reqText}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Readiness ───────────────────── */}
        <div className="p-[20px] border-l border-[#f0f0ec]">
          <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-[8px] block">Readiness</span>

          {/* Big percentage */}
          <div className="text-center mb-[4px]">
            <span className="text-[28px] font-bold text-[#1a1a1a]">{board.readiness}%</span>
          </div>
          <div className="text-center mb-[16px]">
            <span className="text-[11px] text-[#acacac]">{passedGates} of {board.gates.length} gates</span>
          </div>

          {/* Evidence */}
          <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-[6px] block">Evidence</span>
          <div className="flex flex-col gap-[4px] mb-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b6b6b]">Records</span>
              <span className="text-[11px] text-[#1a1a1a] font-medium">{board.evidence.records}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b6b6b]">Artifacts</span>
              <span className="text-[11px] text-[#1a1a1a] font-medium">{board.evidence.artifacts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b6b6b]">Approvals</span>
              <span className={cn('text-[11px] font-medium', board.evidence.approvals.includes('pending') ? 'text-[#ff9800]' : 'text-[#1a1a1a]')}>
                {board.evidence.approvals}
              </span>
            </div>
          </div>

          {/* Metadata */}
          <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-[6px] block">Metadata</span>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6b6b6b]">Created</span>
            <span className="text-[11px] text-[#1a1a1a] font-medium">{board.created}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stats Row ────────────────────────────────────────────────

function StatsRow() {
  const totalGates = BOARDS.reduce((sum, b) => sum + b.gates.length, 0);
  const passed = BOARDS.reduce((sum, b) => sum + b.gates.filter((g) => g.status === 'passed').length, 0);
  const pending = BOARDS.reduce((sum, b) => sum + b.gates.filter((g) => g.status === 'pending').length, 0);
  const blocked = BOARDS.reduce((sum, b) => sum + b.gates.filter((g) => g.status === 'blocked').length, 0);
  const totalEvidence = BOARDS.reduce((sum, b) => sum + b.evidence.records, 0);
  const requiresAction = BOARDS.reduce((sum, b) => sum + (b.evidence.approvals.includes('pending') ? 1 : 0), 0);
  const atRelease = BOARDS.filter((b) => b.type === 'release').length;

  const stats = [
    { value: String(BOARDS.length), label: 'total boards' },
    { value: String(totalGates), label: `${passed} passed · ${pending} pending · ${blocked} blocked` },
    { value: String(totalEvidence), label: 'evidence records across all boards' },
    { value: String(requiresAction), label: 'requires action', highlight: requiresAction > 0 },
    { value: String(atRelease), label: 'no boards at release' },
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

// ── Status Bar ───────────────────────────────────────────────

function StatusBar() {
  const studyCount = BOARDS.filter((b) => b.type === 'study').length;
  const exploreCount = BOARDS.filter((b) => b.type === 'explore').length;

  return (
    <div className="flex justify-center mt-[12px]">
      <div className="inline-flex h-[36px] items-center gap-[8px] rounded-full bg-white px-[20px] shadow-[0px_4px_16px_rgba(0,0,0,0.12)] text-[11px] font-medium text-[#6b6b6b] border border-[#f0f0ec]">
        <span className="w-[6px] h-[6px] rounded-full bg-[#4caf50]" />
        <span className="text-[#4caf50]">System Operational</span>
        <span className="text-[#d0d0d0]">·</span>
        <span>{BOARDS.length} boards</span>
        <span className="text-[#d0d0d0]">·</span>
        <span>{studyCount} study · {exploreCount} explore</span>
        <span className="text-[#d0d0d0]">·</span>
        <span className="text-[#ff9800] font-semibold">1 approval pending</span>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function BoardsPage() {
  const navigate = useNavigate();
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);

  useEffect(() => {
    setSidebarContentType('navigation');
    hideBottomBar();
  }, [hideBottomBar, setSidebarContentType]);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [showIntentModal, setShowIntentModal] = useState(false);

  const filtered = useMemo(() => {
    let result = BOARDS;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') {
      result = result.filter((b) => b.type === typeFilter);
    }
    return result;
  }, [search, typeFilter]);

  return (
    <div className="mx-auto w-full max-w-[1116px] px-4 pb-12 pt-0 flex flex-col gap-[12px]">
      {/* ── Header ──────────────────────────────── */}
      <section className="flex items-center h-[60px] bg-white rounded-[12px] px-[20px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] gap-[12px]">
        {/* Title */}
        <div className="flex items-center gap-[8px] shrink-0">
          <GovernanceIcon size={22} />
          <h1 className="text-[18px] font-bold tracking-tight text-[#1a1a1a]">Governance Boards</h1>
          <span className="h-[22px] px-[10px] rounded-[8px] bg-[#f0f0ec] text-[11px] font-medium text-[#acacac] flex items-center">
            {BOARDS.length} boards
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
              placeholder="Search boards..."
              className="bg-transparent border-none text-[12px] ml-[8px] w-full focus:outline-none placeholder:text-[#acacac] text-[#1a1a1a]"
            />
          </div>

          {/* Type filter tabs */}
          <div className="flex items-center h-[36px] bg-[#f5f5f0] rounded-[8px] p-[3px] gap-[2px]">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setTypeFilter(tab.value)}
                className={cn(
                  'h-[30px] px-[14px] rounded-[6px] text-[12px] transition-colors',
                  typeFilter === tab.value
                    ? 'bg-[#2d2d2d] text-white'
                    : tab.color || 'text-[#6b6b6b]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <button className="flex items-center justify-between h-[36px] px-[12px] bg-[#f5f5f0] rounded-[8px] text-[12px] text-[#6b6b6b] w-[130px]">
            <span>Most Recent</span>
            <ChevronDown size={14} className="text-[#acacac]" />
          </button>
        </div>

        {/* Create from Intent */}
        <button
          onClick={() => setShowIntentModal(true)}
          className="h-[36px] px-[14px] bg-[#f5f5f0] hover:bg-[#f0f0ec] text-[#6b6b6b] rounded-[8px] text-[12px] font-semibold flex items-center gap-[6px] transition-colors shrink-0"
        >
          <Sparkles size={14} strokeWidth={2.5} />
          From Intent
        </button>

        {/* New Board */}
        <button
          onClick={() => navigate('/boards/create')}
          className="h-[36px] px-[18px] bg-[#ff9800] hover:bg-[#f57c00] text-white rounded-[8px] text-[12px] font-semibold flex items-center gap-[6px] transition-colors shadow-sm shrink-0"
        >
          <Plus size={14} strokeWidth={2.5} />
          New Board
        </button>
      </section>

      {/* ── Alert Banner ────────────────────────── */}
      <div className="flex items-center justify-between h-[44px] px-[20px] bg-[#fff8e1] rounded-[10px] border border-[#ffe0b2]">
        <div className="flex items-center gap-[8px]">
          <AlertTriangle size={14} className="text-[#ff9800]" />
          <span className="text-[12px] font-medium text-[#ff9800]">1 gate requires your approval</span>
          <span className="text-[12px] text-[#6b6b6b] ml-[4px]">
            Structural Validation Study → Thermal Evidence Gate
          </span>
        </div>
        <button className="h-[28px] px-[14px] rounded-[6px] bg-[#ff9800] text-white text-[11px] font-semibold hover:bg-[#f57c00] transition-colors">
          Review Now
        </button>
      </div>

      {/* ── Board Cards ─────────────────────────── */}
      <div className="flex flex-col gap-[12px]">
        {filtered.map((board) => (
          <BoardCard key={board.id} board={board} />
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-[60px] bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
          <Shield size={36} strokeWidth={1} className="text-[#d0d0d0] mb-[8px]" />
          <p className="text-[14px] font-medium text-[#1a1a1a]">No boards found</p>
          <p className="text-[12px] text-[#6b6b6b] mt-[4px]">Try adjusting your search or filters</p>
        </div>
      )}

      {/* ── Stats Row ───────────────────────────── */}
      <StatsRow />

      {/* ── Status Bar ──────────────────────────── */}
      <StatusBar />

      <CreateFromIntentModal
        isOpen={showIntentModal}
        onClose={() => setShowIntentModal(false)}
      />
    </div>
  );
}
