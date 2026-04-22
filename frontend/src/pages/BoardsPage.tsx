import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronDown, Plus, MoreHorizontal,
  Shield, Sparkles, Rocket, Loader2,
} from 'lucide-react';
import { cn } from '@utils/cn';
import { useUiStore } from '@store/uiStore';
import CreateFromIntentModal from '@components/boards/CreateFromIntentModal';
import { useBoardList } from '@hooks/useBoards';
import type { Board } from '@/types/board';

// ── Types ────────────────────────────────────────────────────

type BoardMode = 'explore' | 'study' | 'release';
type TypeFilter = 'all' | BoardMode;

// ── Config ───────────────────────────────────────────────────

const MODE_COLORS: Record<BoardMode, { bg: string; text: string; border: string }> = {
  study:   { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]', border: 'border-l-[#ff9800]' },
  explore: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]', border: 'border-l-[#2196f3]' },
  release: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]', border: 'border-l-[#4caf50]' },
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

function BoardCard({ board }: { board: Board }) {
  const navigate = useNavigate();
  const mode = (board.mode ?? 'explore') as BoardMode;
  const modeStyle = MODE_COLORS[mode] ?? MODE_COLORS.explore;
  const created = new Date(board.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      onClick={() => navigate(`/boards/${board.id}`)}
      className={cn(
        'bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] overflow-hidden border-l-[4px] cursor-pointer hover:shadow-[0px_3px_16px_0px_rgba(0,0,0,0.12)] transition-shadow',
        modeStyle.border
      )}>
      <div className="grid grid-cols-[1fr_1fr_1fr] min-h-[160px]">
        {/* ── Left: Info ─────────────────────────── */}
        <div className="p-[20px] flex flex-col">
          {/* Title row */}
          <div className="flex items-start justify-between mb-[10px]">
            <div className="flex items-center gap-[8px]">
              <GovernanceIcon size={20} />
              <h3 className="text-[15px] font-semibold text-[#1a1a1a] tracking-tight">{board.name}</h3>
            </div>
            <div className="flex items-center gap-[6px] shrink-0 ml-[8px]">
              <span className={cn('h-[22px] px-[10px] rounded-[6px] text-[11px] font-medium flex items-center capitalize', modeStyle.bg, modeStyle.text)}>
                {mode}
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
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-[24px] h-[24px] flex items-center justify-center rounded-[6px] text-[#acacac] hover:text-[#6b6b6b] hover:bg-[#f5f5f0] transition-colors"
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>

          {/* Type tag */}
          <div className="flex items-center gap-[6px] mb-[16px]">
            <span className="h-[22px] px-[8px] rounded-[4px] text-[10px] font-medium flex items-center border border-[#e8e8e8] text-[#6b6b6b] bg-white">
              {board.type}
            </span>
            {board.status && (
              <span className="h-[22px] px-[8px] rounded-[4px] text-[10px] font-medium flex items-center border border-[#e8e8e8] text-[#6b6b6b] bg-white capitalize">
                {board.status.toLowerCase()}
              </span>
            )}
          </div>

          {/* Description */}
          {board.description && (
            <p className="text-[11px] text-[#6b6b6b] leading-[15px] line-clamp-2">{board.description}</p>
          )}
        </div>

        {/* ── Middle: Details ─────────────────────── */}
        <div className="p-[20px] border-l border-[#f0f0ec] flex flex-col gap-[8px]">
          <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-[4px] block">Details</span>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6b6b6b]">Owner</span>
            <span className="text-[11px] text-[#1a1a1a] font-medium">{board.owner}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6b6b6b]">Mode</span>
            <span className={cn('text-[11px] font-medium capitalize', modeStyle.text)}>{mode}</span>
          </div>
          {board.project_id && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b6b6b]">Project</span>
              <span className="text-[11px] text-[#1a1a1a] font-medium">{board.project_id}</span>
            </div>
          )}
        </div>

        {/* ── Right: Metadata ───────────────────── */}
        <div className="p-[20px] border-l border-[#f0f0ec] flex flex-col gap-[8px]">
          <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-[4px] block">Metadata</span>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6b6b6b]">Created</span>
            <span className="text-[11px] text-[#1a1a1a] font-medium">{created}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6b6b6b]">Updated</span>
            <span className="text-[11px] text-[#1a1a1a] font-medium">
              {new Date(board.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stats Row ────────────────────────────────────────────────

function StatsRow({ boards }: { boards: Board[] }) {
  const exploreCount = boards.filter((b) => b.mode === 'explore').length;
  const studyCount   = boards.filter((b) => b.mode === 'study').length;
  const releaseCount = boards.filter((b) => b.mode === 'release').length;

  const stats = [
    { value: String(boards.length), label: 'total boards' },
    { value: String(exploreCount),  label: 'explore mode' },
    { value: String(studyCount),    label: 'study mode' },
    { value: String(releaseCount),  label: 'release mode' },
    { value: '—',                   label: 'gates summary (load board)' },
  ];

  return (
    <div className="grid grid-cols-5 gap-[16px] bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] px-[24px] py-[16px]">
      {stats.map((stat) => (
        <div key={stat.label}>
          <div className="text-[22px] font-bold tracking-tight text-[#1a1a1a]">
            {stat.value}
          </div>
          <div className="text-[10px] mt-[2px] text-[#6b6b6b]">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Status Bar ───────────────────────────────────────────────

function StatusBar({ boards }: { boards: Board[] }) {
  const studyCount   = boards.filter((b) => b.mode === 'study').length;
  const exploreCount = boards.filter((b) => b.mode === 'explore').length;

  return (
    <div className="flex justify-center mt-[12px]">
      <div className="inline-flex h-[36px] items-center gap-[8px] rounded-full bg-white px-[20px] shadow-[0px_4px_16px_rgba(0,0,0,0.12)] text-[11px] font-medium text-[#6b6b6b] border border-[#f0f0ec]">
        <span className="w-[6px] h-[6px] rounded-full bg-[#4caf50]" />
        <span className="text-[#4caf50]">System Operational</span>
        <span className="text-[#d0d0d0]">·</span>
        <span>{boards.length} boards</span>
        <span className="text-[#d0d0d0]">·</span>
        <span>{studyCount} study · {exploreCount} explore</span>
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

  const { data: boards, isLoading, isError } = useBoardList();

  const filtered = useMemo(() => {
    let result = boards ?? [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') {
      result = result.filter((b) => b.mode === typeFilter);
    }
    return result;
  }, [boards, search, typeFilter]);

  return (
    <div className="mx-auto w-full max-w-[1116px] px-4 pb-12 pt-0 flex flex-col gap-[12px]">
      {/* ── Header ──────────────────────────────── */}
      <section className="flex items-center h-[60px] bg-white rounded-[12px] px-[20px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] gap-[12px]">
        {/* Title */}
        <div className="flex items-center gap-[8px] shrink-0">
          <GovernanceIcon size={22} />
          <h1 className="text-[18px] font-bold tracking-tight text-[#1a1a1a]">Governance Boards</h1>
          <span className="h-[22px] px-[10px] rounded-[8px] bg-[#f0f0ec] text-[11px] font-medium text-[#acacac] flex items-center">
            {isLoading ? '…' : `${boards?.length ?? 0} boards`}
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

      {/* ── Loading State ─────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-[60px] bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
          <Loader2 size={28} className="text-[#ff9800] animate-spin" />
          <span className="ml-[10px] text-[13px] text-[#6b6b6b]">Loading boards…</span>
        </div>
      )}

      {/* ── Error State ───────────────────────── */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-[60px] bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
          <Shield size={36} strokeWidth={1} className="text-[#e74c3c] mb-[8px]" />
          <p className="text-[14px] font-medium text-[#1a1a1a]">Failed to load boards</p>
          <p className="text-[12px] text-[#6b6b6b] mt-[4px]">Check your connection and try again</p>
        </div>
      )}

      {/* ── Board Cards ─────────────────────────── */}
      {!isLoading && !isError && (
        <>
          <div className="flex flex-col gap-[12px]">
            {filtered.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>

          {/* Empty State */}
          {filtered.length === 0 && boards && boards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-[60px] bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
              <Shield size={36} strokeWidth={1} className="text-[#d0d0d0] mb-[8px]" />
              <p className="text-[14px] font-medium text-[#1a1a1a]">No boards yet — create one</p>
              <p className="text-[12px] text-[#6b6b6b] mt-[4px]">Click "New Board" to get started</p>
            </div>
          )}

          {/* Filtered empty state */}
          {filtered.length === 0 && boards && boards.length > 0 && (
            <div className="flex flex-col items-center justify-center py-[60px] bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
              <Shield size={36} strokeWidth={1} className="text-[#d0d0d0] mb-[8px]" />
              <p className="text-[14px] font-medium text-[#1a1a1a]">No boards found</p>
              <p className="text-[12px] text-[#6b6b6b] mt-[4px]">Try adjusting your search or filters</p>
            </div>
          )}
        </>
      )}

      {/* ── Stats Row ───────────────────────────── */}
      <StatsRow boards={boards ?? []} />

      {/* ── Status Bar ──────────────────────────── */}
      <StatusBar boards={boards ?? []} />

      <CreateFromIntentModal
        isOpen={showIntentModal}
        onClose={() => setShowIntentModal(false)}
      />
    </div>
  );
}
