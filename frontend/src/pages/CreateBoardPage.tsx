import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Plus, X, Trash2,
  Shield, Compass, BookOpen, Package,
  Wrench, FlaskConical, Loader2, Bot,
} from 'lucide-react';
import { cn } from '@utils/cn';
import { useUiStore } from '@store/uiStore';
import { useCreateBoard } from '@hooks/useBoards';
import { useAgentList } from '@hooks/useAgents';
import { useIntentTypes } from '@hooks/useIntents';
import { createIntent } from '@api/intents';
import IntentSpecForm, { buildIntentSpecPayload } from '@components/boards/IntentSpecForm';
import type { AgentListItem } from '@api/agents';
import {
  validateIntentDraft,
  type IntentCriterionDraft,
  type IntentInputDraft,
  type IntentDraft,
} from '@utils/intentValidation';

// ── Types ──────────────────────────────────────────────────

type BoardType = 'engineering' | 'research';
type GovernanceMode = 'explore' | 'study' | 'release';
type GateType = 'evidence' | 'review' | 'compliance';

interface ValidationCard {
  id: string;
  name: string;
  category: string;
  status: string;
}

interface GateRequirement {
  id: string;
  metric: string;
  operator: string;
  value: string;
  unit: string;
}

interface Gate {
  id: string;
  name: string;
  type: GateType;
  requirements: GateRequirement[];
  autoEvaluate: boolean;
  timeout: string;
  variable: boolean;
}

interface LinkedWorkflow {
  id: string;
  name: string;
  primary?: boolean;
}

interface LinkedAgent {
  id: string;
  name: string;
  primary?: boolean;
}

// ── Mock Data ──────────────────────────────────────────────

const VERTICAL_DOMAINS = [
  'Structural Engineering',
  'Thermal Engineering',
  'Fluid Dynamics',
  'Materials Science',
  'Manufacturing',
  'Electrical Engineering',
];

const VERTICAL_TAGS: Record<string, string[]> = {
  'Structural Engineering': ['Structural', 'Thermal', 'Materials', 'Fatigue', 'DFM', 'ML/AI'],
  'Thermal Engineering': ['Heat Transfer', 'Thermal Cycling', 'Insulation', 'Cooling'],
  'Fluid Dynamics': ['CFD', 'Turbulence', 'Flow', 'Pressure'],
};

// ── Section Label ──────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center h-[13px] pb-px">
      <span className="font-semibold text-[11px] text-[#acacac] tracking-[0.5px] uppercase leading-[13.2px]">
        {children}
      </span>
    </div>
  );
}

function HelperText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-[#acacac] leading-[13.5px]">{children}</p>
  );
}

function RequiredStar() {
  return <span className="font-semibold text-[11px] text-[#e74c3c] ml-[2px]">*</span>;
}

// ── Board Type Card ────────────────────────────────────────

function BoardTypeCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-[3px] items-start min-h-[72px] p-[15px] rounded-[8px] border text-left transition-all',
        selected
          ? 'bg-[#fffaf5] border-[#ff9800] shadow-[0px_0px_0px_3px_rgba(255,152,0,0.08)]'
          : 'bg-white border-[#e8e8e8] hover:border-[#d0d0d0]'
      )}
    >
      {selected && (
        <div className="absolute top-[12px] right-[12px] w-[6px] h-[6px] rounded-[3px] bg-[#ff9800]" />
      )}
      <div className="text-[#6b6b6b]">{icon}</div>
      <p className="font-semibold text-[14px] text-[#1a1a1a] leading-normal">{title}</p>
      <p className="text-[11px] text-[#6b6b6b] leading-[15.95px]">{description}</p>
    </button>
  );
}

// ── Mode Card ──────────────────────────────────────────────

function ModeCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-[3px] items-start min-h-[72px] p-[15px] rounded-[8px] border text-left transition-all',
        selected
          ? 'bg-[#f8fcff] border-[#2196f3] shadow-[0px_0px_0px_3px_rgba(33,150,243,0.1)]'
          : 'bg-white border-[#e8e8e8] hover:border-[#d0d0d0]'
      )}
    >
      <div className="text-[#6b6b6b]">{icon}</div>
      <p className="font-semibold text-[14px] text-[#1a1a1a] leading-normal">{title}</p>
      <p className="text-[11px] text-[#6b6b6b] leading-[15.95px]">{description}</p>
      {/* Radio indicator */}
      <div
        className={cn(
          'absolute bottom-[14px] right-[14px] w-[14px] h-[14px] rounded-[7px] border',
          selected
            ? 'bg-[#2196f3] border-[#2196f3] shadow-[inset_0px_0px_0px_5px_white]'
            : 'bg-white border-[#acacac]'
        )}
      />
    </button>
  );
}

// ── Validation Card Row ────────────────────────────────────

function ValidationCardRow({
  card,
  onRemove,
  onChange,
  highlighted,
}: {
  card: ValidationCard;
  onRemove: () => void;
  onChange: (field: string, value: string) => void;
  highlighted?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-[8px] h-[40px] rounded-[8px] border px-[12px]',
      highlighted
        ? 'bg-[#fffaf5] border-[#ffe0b2]'
        : 'bg-white border-[#e8e8e8]'
    )}>
      <div className="flex items-center gap-[8px] flex-1 min-w-0">
        <span className="text-[#ff9800]">
          <Shield size={14} />
        </span>
        <input
          type="text"
          value={card.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Card name..."
          className="flex-1 min-w-0 bg-transparent text-[13px] text-[#1a1a1a] font-medium focus:outline-none placeholder:text-[#acacac]"
        />
      </div>
      <SelectPill
        value={card.category}
        options={['Simulation', 'Analysis', 'Testing', 'Inspection']}
        onChange={(v) => onChange('category', v)}
      />
      <SelectPill
        value={card.status}
        options={['Pending', 'Ready', 'In Progress']}
        onChange={(v) => onChange('status', v)}
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-[#acacac] hover:text-[#e74c3c] transition-colors p-[4px]"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ── Select Pill (inline dropdown) ──────────────────────────

function SelectPill({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-[4px] h-[26px] px-[8px] bg-[#f5f5f0] rounded-[6px] text-[11px] text-[#6b6b6b] hover:bg-[#e8e8e8] transition-colors"
      >
        {value}
        <ChevronDown size={10} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-[2px] right-0 bg-white rounded-[8px] shadow-[0px_3px_16px_rgba(0,0,0,0.10)] border border-[#e8e8e8] z-50 min-w-[120px] py-[4px]">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={cn(
                  'w-full text-left px-[12px] py-[6px] text-[11px] hover:bg-[#f5f5f0] transition-colors',
                  opt === value ? 'text-[#1a1a1a] font-medium' : 'text-[#6b6b6b]'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Gate Section ───────────────────────────────────────────

function GateSection({
  gate,
  onUpdate,
  onRemove: _onRemove,
}: {
  gate: Gate;
  onUpdate: (g: Gate) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const typeColors: Record<GateType, { bg: string; text: string; label: string }> = {
    evidence: { bg: 'bg-[#4caf50]', text: 'text-white', label: 'Evidence' },
    review: { bg: 'bg-[#ff9800]', text: 'text-white', label: 'Review' },
    compliance: { bg: 'bg-[#e74c3c]', text: 'text-white', label: 'Compliance' },
  };

  const tc = typeColors[gate.type];

  return (
    <div className="border border-[#e8e8e8] rounded-[8px] overflow-hidden bg-white">
      {/* Gate header */}
      <div className="flex items-center gap-[8px] px-[16px] h-[44px]">
        <button type="button" onClick={() => setExpanded(!expanded)} className="text-[#acacac]">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <Shield size={14} className="text-[#ff9800]" />
        <span className="text-[13px] font-semibold text-[#1a1a1a] flex-1">{gate.name}</span>
        <span className={cn('h-[20px] px-[8px] rounded-[4px] text-[9px] font-medium flex items-center', tc.bg, tc.text)}>
          {tc.label}
        </span>
        <span className="text-[11px] text-[#acacac]">{gate.requirements.length} requirements</span>
      </div>

      {/* Gate body */}
      {expanded && (
        <div className="px-[16px] pb-[16px]">
          <div className="text-[9px] font-semibold text-[#acacac] tracking-[0.5px] uppercase mb-[8px]">
            Requirements
          </div>
          <div className="flex flex-col gap-[6px]">
            {gate.requirements.map((req) => (
              <div key={req.id} className="flex items-center gap-[8px]">
                <div className="flex items-center gap-[4px] h-[32px] px-[10px] bg-[#e8f5e9] rounded-[6px] text-[11px] text-[#4caf50] font-medium">
                  {req.metric}
                </div>
                <div className="flex items-center gap-[4px] h-[32px] px-[10px] bg-[#f5f5f0] rounded-[6px] text-[11px] text-[#6b6b6b]">
                  {req.operator}
                </div>
                {req.value && (
                  <div className="flex items-center gap-[4px] h-[32px] px-[10px] bg-[#f5f5f0] rounded-[6px] text-[11px] text-[#1a1a1a] font-medium">
                    {req.value}
                  </div>
                )}
                <button type="button" className="text-[#acacac] hover:text-[#e74c3c] transition-colors">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="flex items-center gap-[4px] mt-[8px] text-[11px] text-[#4caf50] font-medium hover:text-[#388e3c] transition-colors"
          >
            <Plus size={12} />
            Add Requirement
          </button>

          {/* Gate settings */}
          <div className="flex items-center gap-[16px] mt-[12px] pt-[12px] border-t border-[#f0f0ec]">
            <ToggleSwitch
              checked={gate.autoEvaluate}
              onChange={(v) => onUpdate({ ...gate, autoEvaluate: v })}
              label="Auto-evaluate"
            />
            <div className="flex items-center gap-[4px]">
              <span className="text-[11px] text-[#acacac]">Timeout</span>
              <span className="text-[11px] text-[#6b6b6b] font-medium">{gate.timeout}</span>
            </div>
            <ToggleSwitch
              checked={gate.variable}
              onChange={(v) => onUpdate({ ...gate, variable: v })}
              label="Variable"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Toggle Switch ──────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-[6px]"
    >
      <div
        className={cn(
          'relative w-[28px] h-[16px] rounded-full transition-colors',
          checked ? 'bg-[#4caf50]' : 'bg-[#d0d0d0]'
        )}
      >
        <div
          className={cn(
            'absolute top-[2px] w-[12px] h-[12px] rounded-full bg-white shadow-sm transition-transform',
            checked ? 'left-[14px]' : 'left-[2px]'
          )}
        />
      </div>
      <span className="text-[11px] text-[#6b6b6b]">{label}</span>
    </button>
  );
}

// ── Linked Item Chip ───────────────────────────────────────

function LinkedChip({
  label,
  primary,
  icon,
  onRemove,
}: {
  label: string;
  primary?: boolean;
  icon?: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-[6px] h-[36px] px-[14px] rounded-[8px] border text-[12px]',
        primary
          ? 'bg-[#f8fcff] border-[#2196f3] text-[#1a1a1a]'
          : 'bg-white border-[#e8e8e8] text-[#6b6b6b]'
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {primary && <ChevronDown size={12} className="text-[#2196f3]" />}
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-[#acacac] hover:text-[#6b6b6b] transition-colors ml-[2px]">
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// ── Preview Panel ──────────────────────────────────────────

function PreviewPanel({
  boardName,
  boardType,
  vertical,
  mode,
  cards,
  gates,
  workflows,
  agents,
  tags,
  project,
}: {
  boardName: string;
  boardType: BoardType;
  vertical: string;
  mode: GovernanceMode;
  cards: ValidationCard[];
  gates: Gate[];
  workflows: LinkedWorkflow[];
  agents: LinkedAgent[];
  tags: string[];
  project: string;
}) {
  const modeColors: Record<GovernanceMode, { bg: string; text: string }> = {
    explore: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
    study: { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
    release: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
  };

  const mc = modeColors[mode];

  return (
    <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[16px] flex flex-col gap-[6px] sticky top-[16px]">
      {/* Preview label */}
      <span className="font-semibold text-[10px] text-[#acacac] tracking-[0.5px] uppercase leading-[12px]">
        Preview
      </span>

      {/* Board preview card */}
      <div className="bg-[#f5f5f0] rounded-[8px] border-l-[3px] border-l-[#2196f3] py-[18px] pl-[15px] pr-[12px] flex flex-col gap-[4px]">
        {/* Title row */}
        <div className="flex items-center gap-[6px]">
          <Shield size={12} className="text-[#ff9800]" />
          <span className="text-[11px] font-medium text-[#1a1a1a] italic">
            {boardName || 'New Board'}
          </span>
          <div className="flex-1" />
          <span className={cn('h-[18px] px-[6px] rounded-[4px] text-[8px] flex items-center capitalize', mc.bg, mc.text)}>
            {mode}
          </span>
        </div>

        {/* Type tags */}
        <div className="flex items-center gap-[6px]">
          <span className="h-[18px] px-[6px] rounded-[4px] bg-[#fff3e0] text-[8px] text-[#ff9800] flex items-center capitalize">
            {boardType}
          </span>
          {vertical && (
            <span className="h-[18px] px-[6px] rounded-[4px] bg-[#f0f0ec] text-[8px] text-[#6b6b6b] flex items-center">
              {vertical.split(' ')[0]}
            </span>
          )}
        </div>

        {/* Dots + card count */}
        <div className="flex items-center gap-[6px] pt-[4px]">
          {[...Array(Math.min(cards.length, 4))].map((_, i) => (
            <div key={i} className="w-[6px] h-[6px] rounded-[3px] bg-[#acacac]" />
          ))}
          <span className="text-[9px] font-medium text-[#acacac]">
            {cards.length} cards
          </span>
        </div>

        {/* Gates icons + count */}
        <div className="flex items-center gap-[6px]">
          {gates.slice(0, 3).map((_, i) => (
            <Shield key={i} size={11} className="text-[#ff9800]" />
          ))}
          <span className="text-[9px] font-medium text-[#acacac]">
            {gates.length} gates
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#e8e8e8]" />

      {/* Configuration section */}
      <div className="pt-[5px] pb-[0.8px]">
        <span className="font-semibold text-[9px] text-[#acacac] tracking-[0.5px] uppercase leading-[10.8px]">
          Configuration
        </span>
      </div>

      <div className="flex flex-col gap-[6px] pb-[10px]">
        <ConfigRow label="Type" value={boardType === 'engineering' ? 'Engineering' : 'Research'} />
        <ConfigRow label="Vertical" value={vertical.split(' ')[0] || '—'} />
        <ConfigRow label="Mode" value={mode} valueColor={modeColors[mode].text.replace('text-', '')} />
        <ConfigRow label="Cards" value={`${cards.length} defined`} mono />
        <ConfigRow label="Gates" value={`${gates.length} defined`} mono />
        <ConfigRow label="Workflows" value={`${workflows.length} linked`} valueColor="#2196f3" />
        <ConfigRow label="Agents" value={`${agents.length} linked`} valueColor="#9c27b0" />
        <ConfigRow label="Tags" value={`${tags.length} tags`} mono />
        <ConfigRow label="Project" value={project} />
      </div>

      {/* Divider */}
      <div className="h-px bg-[#e8e8e8]" />

      {/* Mode Progression */}
      <div className="pt-[5px] pb-[0.8px]">
        <span className="font-semibold text-[9px] text-[#acacac] tracking-[0.5px] uppercase leading-[10.8px]">
          Mode Progression
        </span>
      </div>

      <div className="flex items-center">
        <div className={cn(
          'h-[20px] px-[8px] rounded-l-[4px] flex items-center text-[9px]',
          mode === 'explore' ? 'bg-[#2196f3] text-white' : 'bg-[#f0f0ec] text-[#acacac]'
        )}>
          Explore
        </div>
        <div className={cn(
          'h-[20px] px-[8px] flex items-center text-[9px]',
          mode === 'study' ? 'bg-[#ff9800] text-white' : 'bg-[#f0f0ec] text-[#acacac]'
        )}>
          Study
        </div>
        <div className={cn(
          'h-[20px] px-[8px] rounded-r-[4px] flex items-center text-[9px]',
          mode === 'release' ? 'bg-[#4caf50] text-white' : 'bg-[#f0f0ec] text-[#acacac]'
        )}>
          Release
        </div>
      </div>

      <p className="text-[8px] text-[#acacac] leading-[10.8px]">
        Start here → escalate when ready
      </p>

      <p className="text-[9px] text-[#acacac] leading-[12.6px] pt-[6.79px]">
        Gates are advisory in Explore mode and enforced starting in Study mode
      </p>
    </div>
  );
}

function ConfigRow({
  label,
  value,
  valueColor,
  mono,
}: {
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-[#acacac]">{label}</span>
      <span
        className={cn(
          'text-[10px] capitalize',
          mono ? 'font-mono' : '',
          valueColor ? '' : 'text-[#1a1a1a]'
        )}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

// ── Board Summary Bar ──────────────────────────────────────

function BoardSummaryBar({
  mode,
  cards,
  gates,
  workflows,
  agents,
}: {
  mode: GovernanceMode;
  cards: ValidationCard[];
  gates: Gate[];
  workflows: LinkedWorkflow[];
  agents: LinkedAgent[];
}) {
  return (
    <div className="rounded-[8px] border border-[#ff9800] bg-[#fffaf5] p-[16px]">
      <div className="flex items-center gap-[6px] mb-[8px]">
        <Shield size={14} className="text-[#ff9800]" />
        <span className="text-[13px] font-semibold text-[#1a1a1a]">Board Summary</span>
      </div>
      <div className="flex items-center gap-[6px] flex-wrap">
        <span className="h-[22px] px-[8px] rounded-[4px] bg-[#fff3e0] text-[10px] text-[#ff9800] font-medium flex items-center">
          Engineering
        </span>
        <span className="h-[22px] px-[8px] rounded-[4px] bg-[#f0f0ec] text-[10px] text-[#6b6b6b] font-medium flex items-center">
          Structural
        </span>
        <span className="h-[22px] px-[8px] rounded-[4px] bg-[#e3f2fd] text-[10px] text-[#2196f3] font-medium flex items-center capitalize">
          {mode} mode
        </span>
        <span className="h-[22px] px-[8px] rounded-[4px] bg-[#f0f0ec] text-[10px] text-[#6b6b6b] font-medium flex items-center">
          {cards.length} cards
        </span>
        <span className="h-[22px] px-[8px] rounded-[4px] bg-[#f0f0ec] text-[10px] text-[#6b6b6b] font-medium flex items-center">
          {gates.length} gates
        </span>
        <span className="h-[22px] px-[8px] rounded-[4px] bg-[#e3f2fd] text-[10px] text-[#2196f3] font-medium flex items-center">
          {workflows.length} workflows
        </span>
        <span className="h-[22px] px-[8px] rounded-[4px] bg-[#f3e5f5] text-[10px] text-[#9c27b0] font-medium flex items-center">
          {agents.length} agent
        </span>
      </div>
      <p className="text-[10px] text-[#acacac] mt-[8px] leading-[14px]">
        Board will be created in {mode.charAt(0).toUpperCase() + mode.slice(1)} mode. Gates are {mode === 'explore' ? 'advisory' : 'enforced'} in {mode.charAt(0).toUpperCase() + mode.slice(1)} mode.
      </p>
    </div>
  );
}

// ── Main Page Component ────────────────────────────────────

export default function CreateBoardPage() {
  const navigate = useNavigate();
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);
  const createBoard = useCreateBoard();

  useEffect(() => {
    setSidebarContentType('navigation');
    hideBottomBar();
  }, [hideBottomBar, setSidebarContentType]);

  // ── Form State ────────────────────────────────
  const [boardName, setBoardName] = useState('');
  const [description, setDescription] = useState('');
  const [boardType, setBoardType] = useState<BoardType>('engineering');
  const [vertical, setVertical] = useState('Structural Engineering');
  const [verticalOpen, setVerticalOpen] = useState(false);
  const [mode, setMode] = useState<GovernanceMode>('explore');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [cards, setCards] = useState<ValidationCard[]>([
    { id: '1', name: 'FEA Stress Test', category: 'Simulation', status: 'Pending' },
    { id: '2', name: 'CFD Flow Analysis', category: 'Simulation', status: 'Pending' },
    { id: '3', name: 'Fatigue Analysis', category: 'Analysis', status: 'Pending' },
  ]);

  const [gates, setGates] = useState<Gate[]>([
    {
      id: 'g1',
      name: 'Structural Evidence Gate',
      type: 'evidence',
      requirements: [
        { id: 'r1', metric: 'von_mises_max', operator: '≤ (lte)', value: '235 MPa', unit: 'MPa' },
        { id: 'r2', metric: 'artifact_exists', operator: 'stress_map', value: '', unit: '' },
        { id: 'r3', metric: 'convergence_met', operator: 'max_stress', value: '< 2%', unit: '' },
      ],
      autoEvaluate: true,
      timeout: '4h',
      variable: true,
    },
    {
      id: 'g2',
      name: 'Review Gate',
      type: 'review',
      requirements: [],
      autoEvaluate: false,
      timeout: '24h',
      variable: false,
    },
    {
      id: 'g3',
      name: 'Release Approval Gate',
      type: 'compliance',
      requirements: [],
      autoEvaluate: false,
      timeout: '48h',
      variable: false,
    },
  ]);

  const [linkedWorkflows, setLinkedWorkflows] = useState<LinkedWorkflow[]>([
    { id: 'w1', name: 'FEA Validation Pipeline', primary: true },
    { id: 'w2', name: 'CFD Analysis Flow', primary: true },
  ]);

  const [nonPrimaryWorkflows, setNonPrimaryWorkflows] = useState<LinkedWorkflow[]>([
    { id: 'w3', name: 'Material Testing Pipeline' },
    { id: 'w4', name: 'Topology Optimization' },
    { id: 'w5', name: 'Mesh Quality Check' },
    { id: 'w6', name: 'Fatigue Life Estimation' },
  ]);

  // Agent picker — sourced from /v0/agents. Multi-select; first selected
  // is treated as the primary agent (so the existing preview/summary chips
  // continue to render with the same primary/non-primary split).
  const { data: agentsData = [], isLoading: agentsLoading, error: agentsError } = useAgentList();
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [primaryAgentId, setPrimaryAgentId] = useState<string | null>(null);

  const linkedAgents: LinkedAgent[] = useMemo(
    () =>
      selectedAgentIds
        .filter((id) => id === primaryAgentId)
        .map((id) => {
          const a = agentsData.find((x) => x.id === id);
          return { id, name: a?.name ?? id, primary: true };
        }),
    [selectedAgentIds, primaryAgentId, agentsData],
  );

  const nonPrimaryAgents: LinkedAgent[] = useMemo(
    () =>
      selectedAgentIds
        .filter((id) => id !== primaryAgentId)
        .map((id) => {
          const a = agentsData.find((x) => x.id === id);
          return { id, name: a?.name ?? id };
        }),
    [selectedAgentIds, primaryAgentId, agentsData],
  );

  // ── IntentSpec State ──────────────────────────
  // Captured here, POSTed to /v0/boards/{id}/intents after the board is
  // created. If the IntentSpec call fails we surface the error but leave
  // the board in place — the user can add an IntentSpec later from
  // BoardDetailPage.
  const verticalSlug = useMemo(() => {
    // VERTICAL_DOMAINS values are display strings; the kernel keys
    // intent types by vertical slug (e.g. "engineering"). For the v1
    // form we map the broad board type to a slug and let the user
    // pick the specific intent type below.
    return boardType === 'engineering' ? 'engineering' : 'science';
  }, [boardType]);
  const { data: intentTypes = [], isLoading: intentTypesLoading } = useIntentTypes(verticalSlug);

  const [intentName, setIntentName] = useState('');
  const [intentDescription, setIntentDescription] = useState('');
  const [intentTypeSlug, setIntentTypeSlug] = useState('');
  const [intentTypeOpen, setIntentTypeOpen] = useState(false);
  const [intentCriteria, setIntentCriteria] = useState<IntentCriterionDraft[]>([
    { name: '', metric: '', operator: 'lte', threshold: '', unit: '' },
  ]);
  const [intentInputs, setIntentInputs] = useState<IntentInputDraft[]>([]);
  const [intentErrors, setIntentErrors] = useState<string[]>([]);
  const [intentWarning, setIntentWarning] = useState<string | null>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>(['structure', 'validation']);
  const [tagInput, setTagInput] = useState('');
  const [project] = useState('Default Project');

  const charCount = description.length;

  const verticalTagList = useMemo(() => {
    return VERTICAL_TAGS[vertical] || ['General'];
  }, [vertical]);

  const addCard = () => {
    setCards((prev) => [
      ...prev,
      {
        id: `card_${Date.now()}`,
        name: '',
        category: 'Simulation',
        status: 'Pending',
      },
    ]);
  };

  const removeCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCard = (id: string, field: string, value: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const addGate = () => {
    setGates((prev) => [
      ...prev,
      {
        id: `gate_${Date.now()}`,
        name: 'New Gate',
        type: 'evidence',
        requirements: [],
        autoEvaluate: false,
        timeout: '4h',
        variable: false,
      },
    ]);
  };

  const addTag = () => {
    if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
      setSelectedTags((prev) => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const intentDraft = useMemo<IntentDraft>(
    () => ({
      name: intentName,
      description: intentDescription,
      intentType: intentTypeSlug,
      criteria: intentCriteria,
      inputs: intentInputs,
    }),
    [intentName, intentDescription, intentTypeSlug, intentCriteria, intentInputs],
  );

  // Single setter that fans the next IntentDraft out into the per-field
  // state slots. Lets us hand a unified `onChange` to IntentSpecForm
  // without changing the shape of the surrounding component.
  const handleIntentDraftChange = (next: IntentDraft) => {
    setIntentName(next.name);
    setIntentDescription(next.description);
    setIntentTypeSlug(next.intentType);
    setIntentCriteria(next.criteria);
    setIntentInputs(next.inputs);
  };

  const handleCreateBoard = async () => {
    if (!boardName.trim()) return;
    setSubmitError(null);
    setIntentWarning(null);

    // Validate IntentSpec before we create anything. Acceptance
    // criteria are required for non-Explore boards (Study/Release).
    const errors = validateIntentDraft(intentDraft, {
      requireCriteria: mode !== 'explore',
    });
    setIntentErrors(errors);
    if (errors.length > 0) {
      setSubmitError('Please fix the IntentSpec errors above before creating the board.');
      return;
    }

    try {
      const newBoard = await createBoard.mutateAsync({
        name: boardName.trim(),
        description: description.trim(),
        type: boardType,
        mode,
      });

      // Best-effort IntentSpec creation. A failure here should not
      // roll back the board — the user can retry from BoardDetailPage.
      try {
        const payload = buildIntentSpecPayload(intentDraft);
        await createIntent(newBoard.id, payload);
      } catch (intentErr) {
        const msg =
          (intentErr as { message?: string } | undefined)?.message ??
          (intentErr instanceof Error ? intentErr.message : 'Unknown error');
        // Surface but do not roll back — board still navigates.
        setIntentWarning(`Board created but IntentSpec failed: ${msg}. You can add it later from the board page.`);
      }

      navigate(`/boards/${newBoard.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create board. Please try again.');
    }
  };

  const toggleAgent = (agent: AgentListItem) => {
    setSelectedAgentIds((prev) => {
      const has = prev.includes(agent.id);
      if (has) {
        // Removing — clear primary if this was it
        if (primaryAgentId === agent.id) {
          setPrimaryAgentId(null);
        }
        return prev.filter((id) => id !== agent.id);
      }
      // First selection becomes primary by default
      if (prev.length === 0) {
        setPrimaryAgentId(agent.id);
      }
      return [...prev, agent.id];
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Scrollable Content ──────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1116px] px-4 pt-[16px] pb-[80px]">
          <div className="flex gap-[20px]">
            {/* ── Main Form ─────────────────────── */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] px-[32px] py-[24px]">
                {/* Title */}
                <div className="flex items-center gap-[10px] mb-[4px]">
                  <Shield size={22} className="text-[#ff9800]" />
                  <h1 className="text-[20px] font-semibold text-[#1a1a1a] leading-[23px]">
                    Create New Board
                  </h1>
                </div>
                <p className="text-[12px] text-[#6b6b6b] mb-[24px] ml-[32px]">
                  Set up a governance board for engineering validation and evidence tracking
                </p>

                {/* ── Board Name ────────────────── */}
                <div className="mb-[24px]">
                  <div className="flex items-center gap-[6px] mb-[8px]">
                    <SectionLabel>Board Name</SectionLabel>
                    <RequiredStar />
                  </div>
                  <div className="bg-[#f5f5f0] rounded-[8px] h-[44px] flex items-center px-[16px]">
                    <input
                      type="text"
                      value={boardName}
                      onChange={(e) => setBoardName(e.target.value)}
                      placeholder="e.g. Structural Validation Study"
                      className="w-full bg-transparent text-[13px] font-medium text-[#1a1a1a] focus:outline-none placeholder:text-[#acacac]"
                    />
                  </div>
                  <HelperText>Use a descriptive name reflecting the validation scope</HelperText>
                </div>

                {/* ── Description ───────────────── */}
                <div className="mb-[24px]">
                  <div className="flex items-center gap-[6px] mb-[8px]">
                    <SectionLabel>Description</SectionLabel>
                    <span className="text-[10px] text-[#acacac] ml-[4px]">Optional</span>
                  </div>
                  <div className="bg-[#f5f5f0] rounded-[8px] px-[16px] py-[12px] relative">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                      placeholder="What is this board validating? What are the acceptance criteria?"
                      rows={3}
                      className="w-full bg-transparent text-[13px] text-[#1a1a1a] focus:outline-none placeholder:text-[#acacac] resize-none"
                    />
                    <div className="flex justify-end">
                      <span className="text-[10px] text-[#acacac]">{charCount} / 1000</span>
                    </div>
                  </div>
                </div>

                {/* ── Board Type & Vertical ─────── */}
                <div className="mb-[24px]">
                  <SectionLabel>Board Type &amp; Vertical</SectionLabel>
                  <div className="grid grid-cols-2 gap-[16px] mt-[8px]">
                    {/* Board Type */}
                    <div className="flex flex-col gap-[4px]">
                      <span className="text-[11px] font-medium text-[#6b6b6b]">Board Type</span>
                      <div className="grid grid-cols-2 gap-[10px]">
                        <BoardTypeCard
                          selected={boardType === 'engineering'}
                          onClick={() => setBoardType('engineering')}
                          icon={<Wrench size={18} />}
                          title="Engineering"
                          description="Hardware validation & release"
                        />
                        <BoardTypeCard
                          selected={boardType === 'research'}
                          onClick={() => setBoardType('research')}
                          icon={<FlaskConical size={18} />}
                          title="Research"
                          description="Hypothesis testing & study"
                        />
                      </div>
                    </div>

                    {/* Vertical Domain */}
                    <div className="flex flex-col gap-[4px]">
                      <span className="text-[11px] font-medium text-[#6b6b6b]">Vertical Domain</span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setVerticalOpen(!verticalOpen)}
                          className="w-full bg-[#f5f5f0] rounded-[8px] h-[44px] flex items-center justify-between px-[16px]"
                        >
                          <span className="text-[13px] font-medium text-[#1a1a1a]">{vertical}</span>
                          <ChevronDown size={14} className="text-[#acacac]" />
                        </button>
                        {verticalOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setVerticalOpen(false)} />
                            <div className="absolute top-full mt-[2px] left-0 right-0 bg-white rounded-[8px] shadow-[0px_3px_16px_rgba(0,0,0,0.10)] border border-[#e8e8e8] z-50 py-[4px]">
                              {VERTICAL_DOMAINS.map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => { setVertical(d); setVerticalOpen(false); }}
                                  className={cn(
                                    'w-full text-left px-[16px] py-[8px] text-[13px] hover:bg-[#f5f5f0] transition-colors',
                                    d === vertical ? 'text-[#1a1a1a] font-medium' : 'text-[#6b6b6b]'
                                  )}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <HelperText>Determines card types and KPI templates</HelperText>
                      <div className="flex gap-[4px] flex-wrap pt-[4px]">
                        {verticalTagList.map((tag, i) => (
                          <span
                            key={tag}
                            className={cn(
                              'h-[20px] px-[8px] rounded-[4px] text-[9px] font-medium flex items-center',
                              i === 0 ? 'bg-[#fff3e0] text-[#ff9800]' : 'bg-[#f0f0ec] text-[#6b6b6b]'
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Governance Mode ───────────── */}
                <div className="mb-[24px]">
                  <SectionLabel>Initial Governance Mode</SectionLabel>
                  <div className="grid grid-cols-3 gap-[12px] mt-[8px]">
                    <ModeCard
                      selected={mode === 'explore'}
                      onClick={() => setMode('explore')}
                      icon={<Compass size={22} className="text-[#2196f3]" />}
                      title="Explore"
                      description="Free experimentation. No gates enforced. Collect initial evidence."
                    />
                    <ModeCard
                      selected={mode === 'study'}
                      onClick={() => setMode('study')}
                      icon={<BookOpen size={22} className="text-[#6b6b6b]" />}
                      title="Study"
                      description="Evidence gates enforced. Structured records required."
                    />
                    <ModeCard
                      selected={mode === 'release'}
                      onClick={() => setMode('release')}
                      icon={<Package size={22} className="text-[#6b6b6b]" />}
                      title="Release"
                      description="All gates must pass. Release packet required."
                    />
                  </div>
                  <p className="text-[9px] italic text-[#acacac] mt-[8px] leading-[12.15px]">
                    Typically boards escalate to Release — rarely start here
                  </p>
                  <div className="flex items-center gap-[8px] mt-[8px]">
                    <span className="text-[10px] text-[#acacac]">Explore</span>
                    <ChevronRight size={12} className="text-[#acacac]" />
                    <span className="text-[10px] text-[#acacac]">Study</span>
                    <ChevronRight size={12} className="text-[#acacac]" />
                    <span className="text-[10px] text-[#acacac]">Release</span>
                    <span className="text-[9px] text-[#acacac] ml-[8px]">
                      Boards can escalate mode but never go back
                    </span>
                  </div>
                </div>

                {/* ── Validation Cards ──────────── */}
                <div className="mb-[24px]">
                  <div className="flex items-center justify-between mb-[8px]">
                    <SectionLabel>Validation Cards</SectionLabel>
                    <span className="text-[10px] text-[#acacac]">Define what needs to be validated</span>
                  </div>
                  <div className="flex flex-col gap-[6px]">
                    {cards.map((card, idx) => (
                      <ValidationCardRow
                        key={card.id}
                        card={card}
                        highlighted={idx === 2}
                        onRemove={() => removeCard(card.id)}
                        onChange={(field, value) => updateCard(card.id, field, value)}
                      />
                    ))}
                    {/* Add new card row */}
                    <button
                      type="button"
                      onClick={addCard}
                      className="flex items-center gap-[8px] h-[40px] px-[12px] bg-[#f5f5f0] rounded-[8px] border border-dashed border-[#d0d0d0] text-[12px] text-[#acacac] hover:border-[#ff9800] hover:text-[#ff9800] transition-colors"
                    >
                      <Plus size={14} />
                      Card name...
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={addCard}
                    className="flex items-center gap-[4px] mt-[8px] text-[11px] text-[#ff9800] font-medium hover:text-[#f57c00] transition-colors"
                  >
                    <Plus size={12} />
                    Add Card
                  </button>
                </div>

                {/* ── Gates ─────────────────────── */}
                <div className="mb-[24px]">
                  <div className="flex items-center justify-between mb-[8px]">
                    <SectionLabel>Gates</SectionLabel>
                    <span className="text-[10px] text-[#acacac]">Define governance checkpoints</span>
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    {gates.map((gate) => (
                      <GateSection
                        key={gate.id}
                        gate={gate}
                        onUpdate={(g) => setGates((prev) => prev.map((x) => (x.id === g.id ? g : x)))}
                        onRemove={() => setGates((prev) => prev.filter((x) => x.id !== gate.id))}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addGate}
                    className="flex items-center gap-[4px] mt-[8px] text-[11px] text-[#ff9800] font-medium hover:text-[#f57c00] transition-colors"
                  >
                    <Plus size={12} />
                    Add Gate
                  </button>
                </div>

                {/* ── Linked Workflows ──────────── */}
                <div className="mb-[24px]">
                  <div className="flex items-center gap-[8px] mb-[4px]">
                    <SectionLabel>Linked Workflows</SectionLabel>
                    <span className="text-[10px] text-[#acacac]">Optional — connect to existing pipelines</span>
                  </div>
                  <div className="grid grid-cols-2 gap-[8px] mb-[8px]">
                    {linkedWorkflows.map((wf) => (
                      <LinkedChip
                        key={wf.id}
                        label={wf.name}
                        primary
                        icon={<Wrench size={12} className="text-[#2196f3]" />}
                        onRemove={() => setLinkedWorkflows((prev) => prev.filter((w) => w.id !== wf.id))}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-[8px]">
                    {nonPrimaryWorkflows.map((wf) => (
                      <LinkedChip
                        key={wf.id}
                        label={wf.name}
                        icon={<Wrench size={12} className="text-[#acacac]" />}
                        onRemove={() => setNonPrimaryWorkflows((prev) => prev.filter((w) => w.id !== wf.id))}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-[#2196f3] mt-[8px]">
                    {linkedWorkflows.length + nonPrimaryWorkflows.length} workflows linked
                  </p>
                </div>

                {/* ── Linked Agents ─────────────── */}
                <div className="mb-[24px]">
                  <div className="flex items-center gap-[8px] mb-[4px]">
                    <SectionLabel>Linked Agents</SectionLabel>
                    <span className="text-[10px] text-[#acacac]">Optional — primary agent is starred</span>
                  </div>

                  {agentsLoading ? (
                    <div className="grid grid-cols-2 gap-[8px]">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-[60px] rounded-[8px] bg-[#f5f5f0] animate-pulse"
                        />
                      ))}
                    </div>
                  ) : agentsError ? (
                    <p className="text-[11px] text-[#e74c3c]">
                      Failed to load agents — link them later from the board page.
                    </p>
                  ) : agentsData.length === 0 ? (
                    <div className="rounded-[8px] border border-dashed border-[#d0d0d0] bg-[#f9f9f7] px-[16px] py-[20px] text-center">
                      <Bot size={20} className="text-[#acacac] mx-auto mb-[6px]" />
                      <p className="text-[12px] text-[#6b6b6b] font-medium">No agents yet</p>
                      <p className="text-[11px] text-[#acacac] mt-[2px]">
                        Create one in <span className="font-mono">/agents</span> to link it here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-[8px]">
                      {agentsData.map((agent) => {
                        const selected = selectedAgentIds.includes(agent.id);
                        const isPrimary = primaryAgentId === agent.id;
                        return (
                          <div
                            key={agent.id}
                            className={cn(
                              'rounded-[8px] border px-[12px] py-[10px] flex flex-col gap-[4px] transition-all cursor-pointer',
                              selected
                                ? isPrimary
                                  ? 'border-[#9c27b0] bg-[#faf5fc] shadow-[0px_0px_0px_3px_rgba(156,39,176,0.08)]'
                                  : 'border-[#9c27b0] bg-white'
                                : 'border-[#e8e8e8] bg-white hover:border-[#d0d0d0]',
                            )}
                            onClick={() => toggleAgent(agent)}
                          >
                            <div className="flex items-center gap-[6px]">
                              <div className="w-[20px] h-[20px] rounded-[4px] bg-[#f3e5f5] flex items-center justify-center shrink-0">
                                <Bot size={12} className="text-[#9c27b0]" />
                              </div>
                              <span className="font-semibold text-[12px] text-[#1a1a1a] truncate flex-1">
                                {agent.name}
                              </span>
                              {selected && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrimaryAgentId(isPrimary ? null : agent.id);
                                  }}
                                  className={cn(
                                    'h-[18px] px-[6px] rounded-[3px] text-[9px] font-medium',
                                    isPrimary
                                      ? 'bg-[#9c27b0] text-white'
                                      : 'bg-[#f0f0ec] text-[#6b6b6b] hover:bg-[#e8e8e8]',
                                  )}
                                  aria-label={isPrimary ? 'Unset primary agent' : 'Set as primary agent'}
                                >
                                  {isPrimary ? 'Primary' : 'Set primary'}
                                </button>
                              )}
                            </div>
                            <p
                              className="text-[11px] text-[#6b6b6b] leading-[14px] line-clamp-2"
                              title={agent.description || ''}
                            >
                              {agent.description || 'No description'}
                            </p>
                            <div className="flex items-center gap-[6px] mt-[2px]">
                              <span className="h-[16px] px-[6px] rounded-[3px] bg-[#f0f0ec] text-[9px] text-[#6b6b6b]">
                                {agent.owner ? agent.owner.slice(0, 12) : 'unknown owner'}
                              </span>
                              {selected && (
                                <span className="text-[9px] text-[#9c27b0] font-medium ml-auto">Selected</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[11px] text-[#9c27b0] mt-[8px]">
                    {selectedAgentIds.length} {selectedAgentIds.length === 1 ? 'agent' : 'agents'} linked
                    {primaryAgentId && selectedAgentIds.length > 1 && ' (1 primary)'}
                  </p>
                </div>

                {/* ── IntentSpec ───────────────── */}
                <div className="mb-[24px]">
                  <div className="flex items-center gap-[8px] mb-[8px]">
                    <SectionLabel>Intent Specification</SectionLabel>
                    <RequiredStar />
                    <span className="text-[10px] text-[#acacac]">Defines what success looks like for this board</span>
                  </div>
                  <IntentSpecForm
                    value={intentDraft}
                    onChange={handleIntentDraftChange}
                    intentTypes={intentTypes}
                    intentTypesLoading={intentTypesLoading}
                    requireCriteria={mode !== 'explore'}
                    errors={intentErrors}
                    intentTypeDropdownOpen={intentTypeOpen}
                    onIntentTypeDropdownToggle={setIntentTypeOpen}
                  />
                </div>

                {/* ── Tags & Project ────────────── */}
                <div className="mb-[24px]">
                  <SectionLabel>Tags &amp; Project</SectionLabel>
                  <div className="flex items-center gap-[8px] mt-[8px]">
                    <div className="flex gap-[4px] flex-wrap">
                      {selectedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-[4px] h-[26px] px-[10px] bg-[#f5f5f0] rounded-[6px] text-[11px] text-[#6b6b6b]"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => setSelectedTags((prev) => prev.filter((t) => t !== tag))}
                            className="text-[#acacac] hover:text-[#6b6b6b] transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center h-[26px] px-[10px] bg-[#f5f5f0] rounded-[6px]">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addTag(); }}
                        placeholder="Add tags..."
                        className="bg-transparent text-[11px] text-[#1a1a1a] focus:outline-none placeholder:text-[#acacac] w-[60px]"
                      />
                    </div>
                    <div className="flex items-center gap-[4px] ml-auto">
                      <Shield size={12} className="text-[#acacac]" />
                      <span className="text-[12px] text-[#1a1a1a] font-medium">{project}</span>
                      <ChevronDown size={12} className="text-[#acacac]" />
                    </div>
                  </div>
                </div>

                {/* ── Board Summary ─────────────── */}
                <BoardSummaryBar
                  mode={mode}
                  cards={cards}
                  gates={gates}
                  workflows={[...linkedWorkflows, ...nonPrimaryWorkflows]}
                  agents={[...linkedAgents, ...nonPrimaryAgents]}
                />
              </div>
            </div>

            {/* ── Right Preview Panel ───────────── */}
            <div className="w-[240px] shrink-0">
              <PreviewPanel
                boardName={boardName}
                boardType={boardType}
                vertical={vertical}
                mode={mode}
                cards={cards}
                gates={gates}
                workflows={[...linkedWorkflows, ...nonPrimaryWorkflows]}
                agents={[...linkedAgents, ...nonPrimaryAgents]}
                tags={selectedTags}
                project={project}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom Bar ────────────────────── */}
      <div className="shrink-0 flex flex-col items-center py-[8px] gap-[6px]">
        {submitError && (
          <p className="text-[11px] text-[#e74c3c] font-medium">{submitError}</p>
        )}
        {intentWarning && (
          <p className="text-[11px] text-[#ff9800] font-medium">{intentWarning}</p>
        )}
        <div className="bg-white rounded-[16px] shadow-[0px_-2px_12px_0px_rgba(0,0,0,0.06),0px_2px_12px_0px_rgba(0,0,0,0.04)] px-[24px] flex items-center gap-[16px] h-[52px]">
          {/* Left: tools info */}
          <div className="flex items-center gap-[8px]">
            <Wrench size={14} className="text-[#acacac]" />
            <span className="text-[11px] text-[#6b6b6b] font-medium">
              3 tools · Anthropic Claude · Threshold 0.85
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex-1" />
          <div className="flex items-center gap-[12px]">
            <button
              type="button"
              onClick={() => navigate('/boards')}
              disabled={createBoard.isPending}
              className="h-[38px] px-[10px] rounded-[8px] text-[13px] text-[#6b6b6b] hover:bg-[#f5f5f0] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={createBoard.isPending}
              className="h-[38px] px-[17px] rounded-[8px] border border-[#2d2d2d] text-[13px] text-[#6b6b6b] hover:bg-[#f5f5f0] transition-colors disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleCreateBoard}
              disabled={!boardName.trim() || createBoard.isPending}
              className="h-[38px] px-[24px] rounded-[8px] bg-[#9c27b0] text-[13px] text-white font-medium hover:bg-[#7b1fa2] transition-colors flex items-center gap-[8px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createBoard.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Create Board
                  <Shield size={14} className="text-white" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
