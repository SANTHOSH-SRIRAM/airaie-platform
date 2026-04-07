import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  ChevronDown,
  MoreHorizontal,
  AlertTriangle,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Lightbulb,
  TrendingUp,
  Zap,
  Eye,
  Loader2,
  Rocket,
} from 'lucide-react';
import { cn } from '@utils/cn';
import Sidebar from '@components/layout/Sidebar';
import { useUiStore } from '@store/uiStore';
import { useBoard, useBoardSummary } from '@hooks/useBoards';
import CardList from '@components/boards/cards/CardList';
import CardDetail from '@components/boards/cards/CardDetail';
import CreateCardModal from '@components/boards/cards/CreateCardModal';
import CardDependencyGraph from '@components/boards/cards/CardDependencyGraph';
import GatePanel from '@components/boards/gates/GatePanel';
import EvidencePanel from '@components/boards/evidence/EvidencePanel';
import PlanViewer from '@components/boards/plans/PlanViewer';
import ExecutePlanButton from '@components/boards/plans/ExecutePlanButton';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    Complete: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
    Running: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
    Pending: { bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]' },
    Blocked: { bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]' },
    PASSED: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
    PENDING: { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
    BLOCKED: { bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]' },
    DRAFT: { bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]' },
    completed: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
    running: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
    draft: { bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]' },
    failed: { bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]' },
  };
  const c = config[status] ?? { bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]' };
  return (
    <span className={cn('h-[20px] px-[10px] rounded-full text-[10px] font-medium inline-flex items-center', c.bg, c.text)}>
      {status}
    </span>
  );
}

function ReadinessCircle({ percent }: { percent: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative w-[52px] h-[52px]">
      <svg width="52" height="52" className="-rotate-90">
        <circle cx="26" cy="26" r={radius} fill="none" stroke="#f0f0ec" strokeWidth="4" />
        <circle cx="26" cy="26" r={radius} fill="none" stroke="#ff9800" strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[42px] h-[42px] rounded-full bg-white flex items-center justify-center">
          <span className="text-[13px] font-bold text-[#1a1a1a]">{percent}%</span>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, current, total, color }: { label: string; current: number; total: number; color: string }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="flex items-center gap-[8px]">
      <span className="text-[11px] text-[#6b6b6b] w-[56px]">{label}</span>
      <div className="flex-1 h-[4px] rounded-full bg-[#f0f0ec]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-mono text-[#1a1a1a]">{current}/{total}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type Tab = 'overview' | 'cards' | 'gates' | 'evidence';

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'cards', label: 'Cards' },
  { value: 'gates', label: 'Gates' },
  { value: 'evidence', label: 'Evidence' },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function BoardDetailPage() {
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);

  useEffect(() => {
    setSidebarContentType('navigation');
  }, [setSidebarContentType]);

  // Hooks for real data
  const { data: board, isLoading: boardLoading } = useBoard(boardId);
  const { data: summary } = useBoardSummary(boardId);

  // Local state
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [activeMode, setActiveMode] = useState<'Explore' | 'Study' | 'Release'>('Study');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showPlanViewer, setShowPlanViewer] = useState<string | null>(null);

  // Derive from summary
  const cardStats = summary?.card_stats ?? { total: 0, completed: 0, failed: 0, running: 0, pending: 0 };
  const gateStats = summary?.gate_stats ?? { total: 0, passed: 0, failed: 0, pending: 0, waived: 0 };
  const readiness = summary?.readiness?.overall ?? 0;
  const readinessPercent = Math.round(readiness * 100);
  const nextActions = summary?.next_actions ?? [];

  // Set mode from board data
  useEffect(() => {
    if (board?.mode) {
      const modeMap: Record<string, 'Explore' | 'Study' | 'Release'> = {
        explore: 'Explore',
        study: 'Study',
        release: 'Release',
      };
      setActiveMode(modeMap[board.mode] ?? 'Study');
    }
  }, [board?.mode]);


  // Loading state
  if (boardLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f5f5f0]">
        <Loader2 size={24} className="animate-spin text-[#acacac]" />
        <span className="ml-[8px] text-[14px] text-[#acacac]">Loading board...</span>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f5f5f0]">
        <Shield size={36} className="text-[#d0d0d0] mb-[8px]" />
        <p className="text-[14px] font-medium text-[#1a1a1a]">Board not found</p>
        <button
          onClick={() => navigate('/boards')}
          className="mt-[12px] text-[12px] text-[#ff9800] hover:underline"
        >
          Back to Boards
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f5f5f0] font-sans flex flex-col">
      {/* TOP BAR */}
      <div className="shrink-0 px-[16px] pt-[12px] pb-[8px]">
        <div className="h-[56px] bg-white rounded-[16px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] flex items-center px-[12px] gap-[12px]">
          {/* Back */}
          <button onClick={() => navigate('/boards')} className="p-[6px] hover:bg-[#f0f0ec] rounded-[6px] transition-colors">
            <ArrowLeft size={18} className="text-[#1a1a1a]" />
          </button>

          <div className="w-[1px] h-[24px] bg-[#e8e8e8]" />

          {/* Board identity */}
          <Shield size={18} className="text-[#ff9800] flex-shrink-0" />
          <span className="text-[14px] font-semibold text-[#1a1a1a] truncate">{board.name}</span>
          <ChevronDown size={14} className="text-[#acacac]" />

          {/* Badges */}
          {board.vertical_id && (
            <span className="h-[22px] px-[10px] rounded-[6px] bg-[#fff3e0] text-[#ff9800] text-[10px] font-medium inline-flex items-center capitalize">
              {board.vertical_id}
            </span>
          )}
          <StatusBadge status={board.status} />

          <div className="flex-1" />

          {/* Mode segmented control */}
          <div className="flex items-center">
            {(['Explore', 'Study', 'Release'] as const).map((mode) => {
              const isActive = activeMode === mode;
              const base = 'h-[28px] px-[12px] text-[11px] font-medium transition-colors inline-flex items-center gap-[6px]';
              let modeClass = '';
              if (mode === 'Explore') {
                modeClass = isActive ? 'bg-[#e3f2fd] text-[#2196f3] rounded-l-[8px]' : 'bg-[#f0f0ec] text-[#acacac] rounded-l-[8px]';
              } else if (mode === 'Study') {
                modeClass = isActive ? 'bg-[#ff9800] text-white font-semibold shadow-[0px_1px_4px_0px_rgba(255,152,0,0.3)]' : 'bg-[#f0f0ec] text-[#acacac]';
              } else {
                modeClass = isActive ? 'bg-[#e3f2fd] text-[#2196f3] rounded-r-[8px]' : 'bg-[#f0f0ec] text-[#acacac] rounded-r-[8px]';
              }
              return (
                <button 
                  key={mode} 
                  onClick={() => {
                    if (mode === 'Release') {
                      navigate(`/boards/${boardId}/release`);
                    } else {
                      setActiveMode(mode);
                    }
                  }} 
                  className={cn(base, modeClass)}
                >
                  {mode}
                </button>
              );
            })}
          </div>

          <button className="h-[34px] px-[15px] border border-[#ff9800] text-[#ff9800] rounded-[8px] font-medium text-[12px] hover:bg-[#fff3e0] transition-colors">
            Evaluate Gates
          </button>

          <button className="p-[6px] hover:bg-[#f0f0ec] rounded-[6px] transition-colors">
            <MoreHorizontal size={18} className="text-[#6b6b6b]" />
          </button>

          <div className="w-[32px] h-[32px] rounded-full bg-[#2d2d2d] text-white text-[12px] font-semibold flex items-center justify-center flex-shrink-0">
            S
          </div>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex flex-1 min-h-0 pt-[8px] pb-[8px]">
        {/* Sidebar */}
        <Sidebar />

        {/* Center content */}
        <div className="flex-1 overflow-y-auto min-w-0">
          <div className="mx-auto flex flex-col gap-[12px] pb-[16px] px-[8px]">
            {/* STATS HEADER */}
            <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
              <div className="flex items-center gap-[24px]">
                {/* Board info */}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">BOARD</span>
                  <h1 className="text-[18px] font-semibold text-[#1a1a1a] mt-[2px]">{board.name}</h1>
                  <p className="text-[12px] font-medium text-[#6b6b6b] mt-[2px] truncate">{board.description ?? ''}</p>
                </div>

                <div className="w-[1px] h-[40px] bg-[#e8e8e8]" />

                {/* Readiness */}
                <div className="flex items-center gap-[12px]">
                  <ReadinessCircle percent={readinessPercent} />
                  <div className="flex flex-col gap-[3px]">
                    <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">Readiness</span>
                    <span className="text-[11px] font-medium text-[#6b6b6b] leading-[14.85px]">
                      {gateStats.passed} of {gateStats.total}<br />gates<br />passed
                    </span>
                  </div>
                </div>

                <div className="w-[1px] h-[40px] bg-[#e8e8e8]" />

                {/* Cards */}
                <div>
                  <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block">CARDS</span>
                  <span className="text-[22px] font-bold text-[#1a1a1a]">{cardStats.total}</span>
                  <span className="text-[10px] text-[#6b6b6b] block">
                    {cardStats.completed} complete {cardStats.running > 0 ? ` \u00B7 ${cardStats.running} running` : ''} {cardStats.pending > 0 ? ` \u00B7 ${cardStats.pending} pending` : ''}
                  </span>
                </div>

                <div className="w-[1px] h-[40px] bg-[#e8e8e8]" />

                {/* Gates */}
                <div>
                  <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block">GATES</span>
                  <span className="text-[22px] font-bold text-[#1a1a1a]">{gateStats.total}</span>
                  <span className="text-[10px] text-[#6b6b6b] block">
                    {gateStats.passed} passed {gateStats.pending > 0 ? ` \u00B7 ${gateStats.pending} pending` : ''}
                  </span>
                </div>

                <div className="w-[1px] h-[40px] bg-[#e8e8e8]" />

                {/* Actions */}
                <div>
                  <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block">ACTIONS</span>
                  <span className={cn('text-[22px] font-bold', nextActions.length > 0 ? 'text-[#ff9800]' : 'text-[#1a1a1a]')}>
                    {nextActions.length}
                  </span>
                  <span className="text-[10px] text-[#6b6b6b] block">
                    {nextActions.length > 0 ? 'pending' : 'none'}
                  </span>
                </div>
              </div>
            </div>

            {/* ALERT BANNER - next actions */}
            {nextActions.length > 0 && (
              <div className="h-[44px] bg-[#fff8f0] border border-[#ffe0b2] rounded-[10px] flex items-center px-[16px] gap-[8px]">
                <AlertTriangle size={14} className="text-[#ff9800] flex-shrink-0" />
                <span className="text-[12px] font-medium text-[#ff9800]">
                  {nextActions[0].description}
                </span>
                <span className="text-[12px] font-medium text-[#6b6b6b] flex-1 truncate">
                  Priority: {nextActions[0].priority}
                </span>
              </div>
            )}

            {/* TAB NAVIGATION */}
            <div className="flex items-center gap-[0px] bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] px-[16px]">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setActiveTab(tab.value);
                    if (tab.value !== 'cards') {
                      setSelectedCardId(null);
                      setShowPlanViewer(null);
                    }
                  }}
                  className={cn(
                    'h-[44px] px-[16px] text-[13px] font-medium transition-colors border-b-2',
                    activeTab === tab.value
                      ? 'text-[#1a1a1a] border-b-[#ff9800]'
                      : 'text-[#acacac] border-b-transparent hover:text-[#6b6b6b]',
                  )}
                >
                  {tab.label}
                </button>
              ))}
              <div className="flex-1" />
              {activeTab === 'cards' && (
                <button
                  onClick={() => setShowCreateCard(true)}
                  className="h-[32px] px-[14px] bg-[#ff9800] hover:bg-[#f57c00] text-white rounded-[8px] text-[11px] font-semibold flex items-center gap-[5px] transition-colors"
                >
                  <Plus size={12} strokeWidth={2.5} /> Create Card
                </button>
              )}
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'overview' && boardId && (
              <OverviewTab
                boardId={boardId}
                cardStats={cardStats}
                gateStats={gateStats}
                readinessPercent={readinessPercent}
                nextActions={nextActions}
              />
            )}

            {activeTab === 'cards' && boardId && (
              <CardsTab
                boardId={boardId}
                selectedCardId={selectedCardId}
                onSelectCard={setSelectedCardId}
                showPlanViewer={showPlanViewer}
                onShowPlanViewer={setShowPlanViewer}
              />
            )}

            {activeTab === 'gates' && boardId && <GatePanel boardId={boardId} />}

            {activeTab === 'evidence' && <EvidenceTabContent />}
          </div>
        </div>

        {/* RIGHT PROPERTIES PANEL */}
        <div className="w-[272px] flex-shrink-0 pl-[8px] pr-[8px] overflow-y-auto">
          <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[20px] overflow-y-auto max-h-full">
            {/* Board info */}
            <div className="mb-[20px]">
              <span className="text-[11px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block">Board</span>
              <span className="text-[14px] font-semibold text-[#1a1a1a] block mt-[4px] leading-[18.9px]">{board.name}</span>
              <div className="mt-[8px]">
                {board.vertical_id && (
                  <span className="h-[21px] px-[10px] rounded-full bg-[#fff3e0] text-[#ff9800] text-[10px] font-medium inline-flex items-center capitalize">
                    {board.vertical_id}
                  </span>
                )}
              </div>
              <p className="text-[12px] font-medium text-[#ff9800] mt-[8px] leading-[16.2px] capitalize">
                Mode: {board.mode}
              </p>
              <p className="text-[11px] font-medium text-[#6b6b6b] mt-[4px] leading-[14.85px]">
                Type: {board.type}
              </p>
            </div>

            <div className="h-[1px] bg-[#e8e8e8] mb-[20px]" />

            {/* Progress */}
            <div className="mb-[20px]">
              <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block mb-[10px]">PROGRESS</span>
              <div className="flex flex-col gap-[8px]">
                <ProgressBar label="Cards" current={cardStats.completed} total={cardStats.total} color="#4caf50" />
                <ProgressBar label="Gates" current={gateStats.passed} total={gateStats.total} color="#ff9800" />
              </div>
            </div>

            <div className="h-[1px] bg-[#e8e8e8] mb-[20px]" />

            {/* Governance Status */}
            <div className="mb-[20px]">
              <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block mb-[10px]">GOVERNANCE</span>
              <div className="flex flex-col gap-[6px]">
                <div className="flex items-center gap-[6px]">
                  <Shield size={12} className="text-[#ff9800]" />
                  <span className="text-[11px] font-medium text-[#6b6b6b] capitalize">
                    {board.mode} mode
                  </span>
                </div>
                <div className="flex items-center gap-[6px]">
                  {gateStats.passed === gateStats.total && gateStats.total > 0 ? (
                    <CheckCircle2 size={12} className="text-[#4caf50]" />
                  ) : gateStats.failed > 0 ? (
                    <XCircle size={12} className="text-[#e74c3c]" />
                  ) : (
                    <Clock size={12} className="text-[#ff9800]" />
                  )}
                  <span className="text-[11px] text-[#6b6b6b]">
                    {gateStats.passed === gateStats.total && gateStats.total > 0
                      ? 'All gates passed'
                      : gateStats.failed > 0
                        ? `${gateStats.failed} gate${gateStats.failed !== 1 ? 's' : ''} failed`
                        : `${gateStats.pending} gate${gateStats.pending !== 1 ? 's' : ''} pending`}
                  </span>
                </div>
                <div className="flex items-center gap-[6px]">
                  <span className={cn(
                    'w-[12px] h-[12px] rounded-full flex items-center justify-center text-[7px] font-bold text-white',
                    readinessPercent >= 80 ? 'bg-[#4caf50]' : readinessPercent >= 40 ? 'bg-[#ff9800]' : 'bg-[#e74c3c]',
                  )}>
                    {readinessPercent >= 80 ? '' : '!'}
                  </span>
                  <span className="text-[11px] text-[#6b6b6b]">
                    {readinessPercent}% completion
                  </span>
                </div>
              </div>
            </div>

            <div className="h-[1px] bg-[#e8e8e8] mb-[20px]" />

            {/* Readiness breakdown */}
            {summary?.readiness && (
              <div className="mb-[20px]">
                <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block mb-[10px]">READINESS</span>
                <div className="flex flex-col gap-[8px]">
                  <ProgressBar label="Design" current={Math.round(summary.readiness.design * 100)} total={100} color="#2196f3" />
                  <ProgressBar label="Validation" current={Math.round(summary.readiness.validation * 100)} total={100} color="#4caf50" />
                  <ProgressBar label="Compliance" current={Math.round(summary.readiness.compliance * 100)} total={100} color="#ff9800" />
                  <ProgressBar label="Mfg" current={Math.round(summary.readiness.manufacturing * 100)} total={100} color="#9c27b0" />
                  <ProgressBar label="Approvals" current={Math.round(summary.readiness.approvals * 100)} total={100} color="#e74c3c" />
                </div>
              </div>
            )}

            <div className="h-[1px] bg-[#e8e8e8] mb-[20px]" />

            {/* Metadata */}
            <div className="mb-[20px]">
              <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block mb-[10px]">METADATA</span>
              <div className="flex flex-col gap-[4px]">
                <p className="text-[11px] font-medium text-[#6b6b6b] leading-[14.85px]">
                  Created: {new Date(board.created_at).toLocaleDateString()}
                </p>
                <p className="text-[11px] font-medium text-[#6b6b6b] leading-[14.85px]">
                  Updated: {new Date(board.updated_at).toLocaleDateString()}
                </p>
                <p className="text-[11px] font-medium text-[#6b6b6b] leading-[14.85px]">
                  Owner: {board.owner}
                </p>
                <p className="text-[11px] font-medium text-[#6b6b6b] leading-[14.85px]">
                  ID: <span className="font-mono text-[10px] text-[#1a1a1a]">{board.id}</span>
                </p>
              </div>
            </div>

            <p className="text-[10px] text-[#acacac] leading-[14px]">
              This board is currently in {board.mode} mode.
              {board.mode === 'study' && ' Gates are enforced and release remains locked until all evidence requirements pass.'}
              {board.mode === 'explore' && ' Gates are informational. Evidence is collected but not enforced.'}
              {board.mode === 'release' && ' All gates must pass. Full compliance and sign-off required.'}
            </p>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="shrink-0 flex justify-center pb-[12px]">
        <div className="h-[52px] bg-white rounded-[16px] shadow-[0px_-2px_12px_0px_rgba(0,0,0,0.06),0px_2px_12px_0px_rgba(0,0,0,0.08)] flex items-center px-[24px] gap-[10px]">
          <button className="h-[38px] px-[18px] bg-[#2d2d2d] text-white rounded-[8px] text-[13px] font-medium flex items-center gap-[8px] hover:bg-[#1a1a1a] transition-colors">
            <Shield size={14} />
            Evaluate All Gates
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className="h-[38px] px-[19px] border border-[#ff9800] text-[#ff9800] rounded-[8px] text-[13px] font-medium flex items-center gap-[8px] hover:bg-[#fff3e0] transition-colors"
          >
            <Plus size={14} />
            Add Evidence
          </button>
          <button className="h-[38px] px-[19px] border border-[#2d2d2d] text-[#6b6b6b] rounded-[8px] text-[13px] font-medium flex items-center gap-[8px] hover:bg-[#f0f0ec] transition-colors relative">
            <Eye size={14} />
            Approval Queue
            {nextActions.length > 0 && (
              <span className="absolute top-[8px] right-[8px] w-[7px] h-[7px] rounded-[3.5px] bg-[#e74c3c]" />
            )}
          </button>

          <button
            onClick={() => navigate(`/boards/${boardId}/release`)}
            className="h-[38px] px-[19px] border border-[#4caf50] text-[#4caf50] hover:bg-[#e8f5e9] rounded-[8px] text-[13px] font-medium flex items-center gap-[8px] transition-colors"
          >
            <Rocket size={14} className="text-[#4caf50]" />
            Release Packet
          </button>

          <div className="w-[1px] h-[24px] bg-[#e8e8e8]" />

          <span className="text-[11px] font-medium text-[#6b6b6b]">
            {cardStats.total} cards {gateStats.total > 0 ? ` \u00B7 ${gateStats.total} gates` : ''}
          </span>

          <div className="flex-1" />

          <div className="flex items-center gap-[6px]">
            <span className={cn('w-[6px] h-[6px] rounded-full', readinessPercent >= 80 ? 'bg-[#4caf50]' : readinessPercent >= 40 ? 'bg-[#ff9800]' : 'bg-[#e74c3c]')} />
            <span className={cn('text-[11px] font-medium', readinessPercent >= 80 ? 'text-[#4caf50]' : readinessPercent >= 40 ? 'text-[#ff9800]' : 'text-[#e74c3c]')}>
              {activeMode} Mode {readinessPercent > 0 ? ` \u00B7 ${readinessPercent}% ready` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Create Card Modal */}
      {boardId && (
        <CreateCardModal
          boardId={boardId}
          isOpen={showCreateCard}
          onClose={() => setShowCreateCard(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

interface OverviewTabProps {
  boardId: string;
  cardStats: { total: number; completed: number; failed: number; running: number; pending: number };
  gateStats: { total: number; passed: number; failed: number; pending: number; waived: number };
  readinessPercent: number;
  nextActions: { type: string; description: string; entity_id: string; priority: 'high' | 'medium' | 'low' }[];
}

function OverviewTab({ boardId, cardStats, gateStats, readinessPercent, nextActions }: OverviewTabProps) {
  return (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-[12px]">
        <StatCard label="Total Cards" value={cardStats.total} sub={`${cardStats.completed} complete`} color="#1a1a1a" />
        <StatCard label="Gates Passed" value={gateStats.passed} sub={`of ${gateStats.total}`} color="#4caf50" />
        <StatCard label="Readiness" value={`${readinessPercent}%`} sub="overall" color="#ff9800" />
        <StatCard label="Next Actions" value={nextActions.length} sub={nextActions.length > 0 ? nextActions[0].priority : 'none'} color={nextActions.length > 0 ? '#ff9800' : '#4caf50'} />
      </div>

      {/* Dependency Graph */}
      <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
        <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block mb-[12px]">
          Card Dependencies
        </span>
        <CardDependencyGraph boardId={boardId} />
      </div>

      {/* Next Actions */}
      {nextActions.length > 0 && (
        <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
          <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block mb-[12px]">
            Next Actions
          </span>
          <div className="flex flex-col gap-[8px]">
            {nextActions.map((action, i) => (
              <div key={i} className="flex items-center gap-[10px] p-[12px] rounded-[8px] border border-[#e8e8e8]">
                <span className={cn(
                  'h-[20px] px-[8px] rounded-[4px] text-[9px] font-semibold uppercase inline-flex items-center',
                  action.priority === 'high' && 'bg-[#ffebee] text-[#e74c3c]',
                  action.priority === 'medium' && 'bg-[#fff3e0] text-[#ff9800]',
                  action.priority === 'low' && 'bg-[#f0f0ec] text-[#6b6b6b]',
                )}>
                  {action.priority}
                </span>
                <span className="text-[12px] font-medium text-[#1a1a1a] flex-1">{action.description}</span>
                <span className="text-[10px] font-mono text-[#acacac]">{action.entity_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Board Intelligence (kept as static insights) */}
      <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
        <span className="text-[14px] font-semibold text-[#1a1a1a] block mb-[16px]">Board Intelligence</span>
        <div className="grid grid-cols-3 gap-[12px]">
          {[
            { icon: Lightbulb, color: '#ff9800', title: 'Readiness Analysis', description: `Board is ${readinessPercent}% ready. ${gateStats.pending > 0 ? `${gateStats.pending} gates pending review.` : 'All gates evaluated.'}` },
            { icon: TrendingUp, color: '#4caf50', title: 'Card Progress', description: `${cardStats.completed} of ${cardStats.total} cards completed.${cardStats.running > 0 ? ` ${cardStats.running} currently running.` : ''}` },
            { icon: Zap, color: '#2196f3', title: 'Pipeline Status', description: cardStats.running > 0 ? 'Active analysis pipelines are running. Results expected shortly.' : 'No active pipelines. Generate plans from card detail to start.' },
          ].map((insight) => (
            <div key={insight.title} className="rounded-[10px] border-l-4 p-[14px] bg-[#fafafa]" style={{ borderLeftColor: insight.color }}>
              <div className="flex items-center gap-[6px] mb-[8px]">
                <insight.icon size={14} style={{ color: insight.color }} />
                <span className="text-[12px] font-semibold text-[#1a1a1a]">{insight.title}</span>
              </div>
              <p className="text-[11px] text-[#6b6b6b] leading-[16px]">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[20px]">
      <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block">{label}</span>
      <span className="text-[28px] font-bold mt-[4px] block" style={{ color }}>{value}</span>
      <span className="text-[11px] text-[#6b6b6b] block">{sub}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards Tab
// ---------------------------------------------------------------------------

interface CardsTabProps {
  boardId: string;
  selectedCardId: string | null;
  onSelectCard: (id: string | null) => void;
  showPlanViewer: string | null;
  onShowPlanViewer: (cardId: string | null) => void;
}

function CardsTab({ boardId, selectedCardId, onSelectCard, showPlanViewer, onShowPlanViewer }: CardsTabProps) {
  return (
    <div className="flex gap-[12px]">
      {/* Card list (left side) */}
      <div className={cn('bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[20px]', selectedCardId ? 'w-[380px] shrink-0' : 'flex-1')}>
        <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px] block mb-[12px]">
          Validation Cards
        </span>
        <CardList boardId={boardId} onSelectCard={(id) => { onSelectCard(id); onShowPlanViewer(null); }} />
      </div>

      {/* Card detail (right side panel) */}
      {selectedCardId && (
        <div className="flex-1 flex flex-col gap-[12px]">
          {/* Card Detail */}
          <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[20px]">
            {/* Close button */}
            <div className="flex items-center justify-between mb-[12px]">
              <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">Card Detail</span>
              <button
                type="button"
                onClick={() => { onSelectCard(null); onShowPlanViewer(null); }}
                className="text-[11px] text-[#acacac] hover:text-[#6b6b6b] transition-colors"
              >
                Close
              </button>
            </div>
            <CardDetail
              cardId={selectedCardId}
              onGeneratePlan={(cardId) => onShowPlanViewer(cardId)}
              onViewPlan={(cardId) => onShowPlanViewer(cardId)}
            />
          </div>

          {/* Plan Viewer (if open) */}
          {showPlanViewer && (
            <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[20px]">
              <div className="flex items-center justify-between mb-[12px]">
                <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">Execution Plan</span>
                <button
                  type="button"
                  onClick={() => onShowPlanViewer(null)}
                  className="text-[11px] text-[#acacac] hover:text-[#6b6b6b] transition-colors"
                >
                  Close
                </button>
              </div>
              <PlanViewer cardId={showPlanViewer} />
              <div className="mt-[12px]">
                <ExecutePlanButton cardId={showPlanViewer} boardId={boardId} onExecuted={() => { /* navigate to run */ }} />
              </div>
            </div>
          )}

          {/* Evidence for selected card */}
          <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[20px]">
            <EvidencePanel cardId={selectedCardId} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evidence Tab (cross-card)
// ---------------------------------------------------------------------------

function EvidenceTabContent() {
  // For cross-card evidence, we show a message explaining user should select a card
  // This could be enhanced to aggregate all evidence across cards
  return (
    <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[24px]">
      <div className="flex items-center gap-[8px] mb-[16px]">
        <FileText size={16} className="text-[#1a1a1a]" />
        <span className="text-[14px] font-semibold text-[#1a1a1a]">Evidence Overview</span>
      </div>
      <p className="text-[12px] text-[#6b6b6b] mb-[16px]">
        Select a card from the Cards tab to view and manage evidence for individual analysis cards.
        Evidence is attached to cards and evaluated against their KPIs.
      </p>
      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center gap-[8px] p-[12px] rounded-[8px] bg-[#fafafa]">
          <CheckCircle2 size={14} className="text-[#4caf50]" />
          <span className="text-[12px] text-[#6b6b6b]">Evidence is automatically collected from run outputs</span>
        </div>
        <div className="flex items-center gap-[8px] p-[12px] rounded-[8px] bg-[#fafafa]">
          <AlertTriangle size={14} className="text-[#ff9800]" />
          <span className="text-[12px] text-[#6b6b6b]">Manual evidence can be added from the card detail view</span>
        </div>
        <div className="flex items-center gap-[8px] p-[12px] rounded-[8px] bg-[#fafafa]">
          <Shield size={14} className="text-[#ff9800]" />
          <span className="text-[12px] text-[#6b6b6b]">Gates evaluate evidence against their requirements</span>
        </div>
      </div>
    </div>
  );
}
