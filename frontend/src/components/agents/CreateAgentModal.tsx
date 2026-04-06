import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Brain, Lightbulb, ChevronDown, Check, Plus, Trash2,
} from 'lucide-react';
import { cn } from '@utils/cn';

// ── Types ────────────────────────────────────────────────────

type ProviderId = 'anthropic' | 'openai' | 'google' | 'huggingface';
type ApprovalAction = 'read' | 'write' | 'execute' | 'delete';

interface ToolItem {
  id: string;
  name: string;
  version: string;
  status?: 'draft';
}

interface EscalationRule {
  id: string;
  field: 'confidence' | 'cost';
  operator: '<' | '>';
  value: string;
  action: 'Reject' | 'Escalate';
}

interface CreateAgentFormData {
  name: string;
  goal: string;
  provider: ProviderId;
  model: string;
  llmWeight: number;
  selectedTools: string[];
  autoApproveThreshold: number;
  maxCostPerRun: string;
  timeout: string;
  approvalActions: ApprovalAction[];
  escalationRules: EscalationRule[];
  maxRetries: number;
  maxIterations: number;
  maxToolCalls: number;
  tags: string[];
  project: string;
}

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: CreateAgentFormData) => void;
}

// ── Data ─────────────────────────────────────────────────────

const PROVIDERS: {
  id: ProviderId;
  name: string;
  model: string;
  icon: string;
  models: string[];
}[] = [
  { id: 'anthropic', name: 'Anthropic', model: 'Claude Sonnet', icon: 'A', models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'] },
  { id: 'openai', name: 'OpenAI', model: 'GPT-4o', icon: 'O', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { id: 'google', name: 'Google', model: 'Gemini Pro', icon: 'G', models: ['gemini-2.0-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'] },
  { id: 'huggingface', name: 'HuggingFace', model: 'Custom Model', icon: 'H', models: ['mistral-large', 'llama-3.1-70b', 'mixtral-8x22b'] },
];

const TOOLS: ToolItem[] = [
  { id: 'fea-solver', name: 'FEA Solver', version: 'v2.1' },
  { id: 'cfd-engine', name: 'CFD Engine', version: 'v3.0' },
  { id: 'mesh-gen', name: 'Mesh Generator', version: 'v1.0' },
  { id: 'material-db', name: 'Material Database', version: 'v1.2' },
  { id: 'result-analyzer', name: 'Result Analyzer', version: 'v1.0' },
  { id: 'topology-opt', name: 'Topology Opti\u2026', version: 'v0.1', status: 'draft' },
  { id: 'tolerance-analyzer', name: 'Tolerance Analyzer', version: 'v1.1' },
  { id: 'thermal-solver', name: 'Thermal Solver', version: 'v2.0' },
  { id: 'cost-estimator', name: 'Cost Estimator', version: 'v1.0' },
];

const APPROVAL_ACTIONS: { id: ApprovalAction; label: string }[] = [
  { id: 'read', label: 'read' },
  { id: 'write', label: 'write' },
  { id: 'execute', label: 'execute' },
  { id: 'delete', label: 'delete' },
];

const INITIAL_FORM: CreateAgentFormData = {
  name: '',
  goal: '',
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  llmWeight: 0.7,
  selectedTools: ['fea-solver', 'mesh-gen', 'result-analyzer'],
  autoApproveThreshold: 0.85,
  maxCostPerRun: '10.00',
  timeout: '600',
  approvalActions: ['write', 'delete'],
  escalationRules: [
    { id: '1', field: 'confidence', operator: '<', value: '0.5', action: 'Reject' },
    { id: '2', field: 'cost', operator: '>', value: '5.00', action: 'Escalate' },
  ],
  maxRetries: 3,
  maxIterations: 5,
  maxToolCalls: 15,
  tags: ['optimization'],
  project: 'Default Project',
};

// ── Provider Icon SVGs ───────────────────────────────────────

function AnthropicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.634-4.228H6.37l-1.6 4.228H1.2l5.37-16.96zm1.9 5.065L5.89 14.058h5.237l-2.66-5.473z" fill="currentColor"/>
    </svg>
  );
}

function OpenAIIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.042 6.042 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" fill="currentColor"/>
    </svg>
  );
}

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function HuggingFaceIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#FFD21E"/>
      <path d="M8.5 10.5c.828 0 1.5-.448 1.5-1s-.672-1-1.5-1S7 9.048 7 9.5s.672 1 1.5 1zm7 0c.828 0 1.5-.448 1.5-1s-.672-1-1.5-1-1.5.448-1.5 1 .672 1 1.5 1zM12 17c-2.21 0-4-1.343-4-3h8c0 1.657-1.79 3-4 3z" fill="#1a1a1a"/>
    </svg>
  );
}

const providerIcons: Record<ProviderId, (props: { size?: number }) => JSX.Element> = {
  anthropic: AnthropicIcon,
  openai: OpenAIIcon,
  google: GoogleIcon,
  huggingface: HuggingFaceIcon,
};

// ── Sub-components ───────────────────────────────────────────

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]', className)}>
      {children}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] text-[#6b6b6b]">{children}</span>;
}

function HintText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('text-[10px] text-[#acacac]', className)}>{children}</span>;
}

function SliderTrack({
  value,
  min,
  max,
  step,
  onChange,
  color,
  leftLabel,
  rightLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color: string;
  leftLabel?: string;
  rightLabel?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const raw = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const stepped = Math.round((raw * (max - min)) / step) * step + min;
      onChange(Math.round(stepped * 100) / 100);
    },
    [max, min, onChange, step],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) updateFromEvent(e.clientX); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [updateFromEvent]);

  return (
    <div className="flex flex-col gap-[8px]">
      <div
        ref={trackRef}
        className="relative h-[4px] w-full rounded-full bg-[#e8e8e8] cursor-pointer"
        onMouseDown={(e) => { dragging.current = true; updateFromEvent(e.clientX); }}
      >
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-[16px] h-[16px] rounded-full bg-white border-2 cursor-grab active:cursor-grabbing"
          style={{ left: `calc(${pct}% - 8px)`, borderColor: color }}
        />
      </div>
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between">
          {leftLabel && <HintText>{leftLabel}</HintText>}
          {rightLabel && <HintText>{rightLabel}</HintText>}
        </div>
      )}
    </div>
  );
}

function ConstraintCounter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-[10px]">
        <div className="flex items-center justify-center w-[36px] h-[36px] rounded-full bg-[#9c27b0] text-white text-[13px] font-bold font-mono">
          {value}
        </div>
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onChange(value + 1)}
            className="w-[18px] h-[14px] flex items-center justify-center rounded-sm bg-[#f5f5f0] hover:bg-[#ece9e3] text-[#6b6b6b] transition-colors"
          >
            <ChevronDown size={10} className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.max(1, value - 1))}
            className="w-[18px] h-[14px] flex items-center justify-center rounded-sm bg-[#f5f5f0] hover:bg-[#ece9e3] text-[#6b6b6b] transition-colors"
          >
            <ChevronDown size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function CreateAgentModal({ open, onClose, onSubmit }: CreateAgentModalProps) {
  const [form, setForm] = useState<CreateAgentFormData>(INITIAL_FORM);
  const [tagInput, setTagInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, onClose]);

  const update = useCallback(<K extends keyof CreateAgentFormData>(key: K, val: CreateAgentFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleTool = useCallback((toolId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedTools: prev.selectedTools.includes(toolId)
        ? prev.selectedTools.filter((t) => t !== toolId)
        : [...prev.selectedTools, toolId],
    }));
  }, []);

  const toggleApproval = useCallback((action: ApprovalAction) => {
    setForm((prev) => ({
      ...prev,
      approvalActions: prev.approvalActions.includes(action)
        ? prev.approvalActions.filter((a) => a !== action)
        : [...prev.approvalActions, action],
    }));
  }, []);

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !form.tags.includes(trimmed)) {
      update('tags', [...form.tags, trimmed]);
    }
    setTagInput('');
  }, [form.tags, tagInput, update]);

  const removeTag = useCallback((tag: string) => {
    update('tags', form.tags.filter((t) => t !== tag));
  }, [form.tags, update]);

  const addRule = useCallback(() => {
    update('escalationRules', [
      ...form.escalationRules,
      { id: String(Date.now()), field: 'confidence', operator: '<', value: '0.5', action: 'Reject' },
    ]);
  }, [form.escalationRules, update]);

  const removeRule = useCallback((id: string) => {
    update('escalationRules', form.escalationRules.filter((r) => r.id !== id));
  }, [form.escalationRules, update]);

  const updateRule = useCallback((id: string, patch: Partial<EscalationRule>) => {
    update('escalationRules', form.escalationRules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, [form.escalationRules, update]);

  const selectedProvider = useMemo(() => PROVIDERS.find((p) => p.id === form.provider)!, [form.provider]);

  const summaryTags = useMemo(() => {
    const prov = selectedProvider;
    return [
      `${prov.name} ${prov.model.split(' ')[0]}`,
      `${form.selectedTools.length} tools`,
      `LLM ${form.llmWeight}`,
      `Threshold ${form.autoApproveThreshold}`,
      `Budget $${form.maxCostPerRun}`,
      `Timeout ${form.timeout}s`,
    ];
  }, [form, selectedProvider]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create New Agent"
        className="relative flex flex-col w-full max-w-[720px] max-h-[calc(100vh-80px)] bg-white rounded-[16px] shadow-[0px_24px_48px_rgba(0,0,0,0.16)] overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 w-[28px] h-[28px] flex items-center justify-center rounded-[8px] text-[#acacac] hover:text-[#6b6b6b] hover:bg-[#f5f5f0] transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Scrollable Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-[32px] pt-[28px] pb-[24px]">
          {/* ── Header ──────────────────────────────── */}
          <div className="flex flex-col gap-[6px] mb-[28px]">
            <div className="flex items-center gap-[10px]">
              <div className="w-[32px] h-[32px] rounded-[10px] bg-[#f3e5f9] flex items-center justify-center">
                <Brain size={18} className="text-[#9c27b0]" />
              </div>
              <h2 className="text-[20px] font-semibold text-[#1a1a1a] leading-[22px]">Create New Agent</h2>
            </div>
            <p className="text-[13px] font-medium text-[#6b6b6b] leading-[17.5px]">
              Create an AI agent that autonomously selects and executes engineering tools
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center mb-[24px]">
            <div className="inline-flex items-center gap-[6px] px-[14px] h-[28px] rounded-full bg-[#f5f5f0] text-[10px] text-[#acacac]">
              <span className="font-medium text-[#6b6b6b]">Step 1 of 1</span>
              <span>·</span>
              <span>Quick Setup</span>
              <span>·</span>
              <span>Advanced config available in Builder</span>
            </div>
          </div>

          {/* ── Agent Name ──────────────────────────── */}
          <div className="mb-[24px]">
            <SectionLabel>Agent Name</SectionLabel>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. FEA Optimizer Agent"
              className="mt-[8px] w-full h-[44px] px-[17px] rounded-[8px] border border-[#e8e8e8] bg-white text-[14px] text-[#1a1a1a] placeholder:text-[#acacac] focus:border-[#9c27b0] focus:outline-none focus:ring-[3px] focus:ring-[#9c27b0]/8 transition-all"
            />
            <HintText className="mt-[6px] block">Give your agent a descriptive name</HintText>
          </div>

          {/* ── Goal ────────────────────────────────── */}
          <div className="mb-[24px]">
            <div className="flex items-center gap-[6px] mb-[8px]">
              <SectionLabel>Goal</SectionLabel>
              <span className="text-[11px] text-[#e74c3c]">*</span>
            </div>
            <div className="relative">
              <textarea
                value={form.goal}
                onChange={(e) => { if (e.target.value.length <= 500) update('goal', e.target.value); }}
                placeholder="Describe what this agent should achieve. Be specific about inputs, tools, and success criteria..."
                className="w-full h-[100px] px-[16px] py-[14px] rounded-[8px] bg-[#f5f5f0] text-[13px] text-[#1a1a1a] placeholder:text-[#acacac] resize-none focus:outline-none focus:ring-[3px] focus:ring-[#9c27b0]/8 transition-all border-0"
              />
              <span className="absolute bottom-[12px] right-[14px] text-[9px] text-[#acacac] font-mono">
                {form.goal.length} / 500
              </span>
            </div>
            <div className="flex items-center gap-[6px] mt-[8px]">
              <Lightbulb size={10} className="text-[#acacac]" />
              <span className="text-[10px] italic text-[#acacac]">Tip: A good goal describes the desired outcome, not the steps</span>
            </div>
          </div>

          {/* ── Model ───────────────────────────────── */}
          <div className="mb-[24px]">
            <SectionLabel>Model</SectionLabel>
            <FieldLabel>Provider</FieldLabel>

            {/* Provider Cards */}
            <div className="grid grid-cols-4 gap-[10px] mt-[8px]">
              {PROVIDERS.map((prov) => {
                const selected = form.provider === prov.id;
                const Icon = providerIcons[prov.id];
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => { update('provider', prov.id); update('model', prov.models[0]); }}
                    className={cn(
                      'relative flex flex-col gap-[4px] items-start justify-center min-h-[64px] px-[15px] py-[16px] rounded-[8px] border text-left transition-all',
                      selected
                        ? 'bg-[#faf5ff] border-[#9c27b0] shadow-[0px_0px_0px_3px_rgba(156,39,176,0.08)]'
                        : 'bg-white border-[#e8e8e8] hover:border-[#d0d0d0]'
                    )}
                  >
                    {selected && <div className="absolute top-[12px] right-[12px] w-[6px] h-[6px] rounded-[3px] bg-[#9c27b0]" />}
                    <div className="flex items-center gap-[8px]">
                      <div className="w-[16px] h-[16px] flex items-center justify-center text-[#1a1a1a]">
                        <Icon size={16} />
                      </div>
                      <span className="text-[12px] font-medium text-[#1a1a1a]">{prov.name}</span>
                    </div>
                    <span className="text-[10px] text-[#6b6b6b]">{prov.model}</span>
                  </button>
                );
              })}
            </div>

            {/* Model & LLM Weight row */}
            <div className="grid grid-cols-2 gap-[16px] mt-[16px]">
              {/* Model Dropdown */}
              <div className="flex flex-col gap-[4px]">
                <FieldLabel>Model</FieldLabel>
                <div className="relative">
                  <select
                    value={form.model}
                    onChange={(e) => update('model', e.target.value)}
                    className="w-full h-[44px] px-[16px] pr-[36px] rounded-[8px] bg-[#f5f5f0] text-[14px] font-mono text-[#1a1a1a] border-0 appearance-none cursor-pointer focus:outline-none focus:ring-[3px] focus:ring-[#9c27b0]/8"
                  >
                    {selectedProvider.models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[#acacac] pointer-events-none" />
                </div>
              </div>

              {/* LLM Weight */}
              <div className="flex flex-col gap-[4px]">
                <FieldLabel>LLM Weight</FieldLabel>
                <div className="flex flex-col gap-[8px] mt-[8px]">
                  <SliderTrack
                    value={form.llmWeight}
                    min={0}
                    max={1}
                    step={0.1}
                    onChange={(v) => update('llmWeight', v)}
                    color="#9c27b0"
                    leftLabel="0.0 Algorithmic"
                    rightLabel="1.0 LLM"
                  />
                  <div className="text-center">
                    <span className="text-[13px] font-bold font-mono text-[#9c27b0]">{form.llmWeight.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Initial Tools ───────────────────────── */}
          <div className="mb-[24px]">
            <div className="flex items-center gap-[6px] mb-[8px]">
              <SectionLabel>Initial Tools</SectionLabel>
              <span className="text-[10px] italic text-[#acacac]">Optional — add more later in Builder</span>
            </div>
            <div className="bg-[#f5f5f0] rounded-[8px] p-[14px] grid grid-cols-3 gap-[8px]">
              {TOOLS.map((tool) => {
                const selected = form.selectedTools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleTool(tool.id)}
                    className={cn(
                      'flex items-center gap-[8px] h-[40px] px-[13px] rounded-[8px] border text-left transition-all',
                      selected
                        ? 'bg-white border-[#2196f3] shadow-[0px_0px_0px_2px_rgba(33,150,243,0.08)]'
                        : 'bg-white border-[#e8e8e8] hover:border-[#d0d0d0]'
                    )}
                  >
                    <div className={cn('w-[6px] h-[6px] rounded-[3px] shrink-0', selected ? 'bg-[#2196f3]' : 'bg-[#d0d0d0]')} />
                    <span className={cn('flex-1 text-[11px] truncate', selected ? 'text-[#1a1a1a]' : 'text-[#6b6b6b]')}>
                      {tool.name}
                    </span>
                    {tool.status === 'draft' && (
                      <span className="px-[5px] h-[14px] rounded-full bg-[#fff3e0] text-[#ff9800] text-[7px] flex items-center justify-center">Draft</span>
                    )}
                    <span className="text-[9px] font-mono text-[#acacac] shrink-0">{tool.version}</span>
                    {selected && <Check size={10} className="text-[#2196f3] shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-start mt-[8px] text-[11px]">
              <span className="text-[#9c27b0]">{form.selectedTools.length} tools selected</span>
              <span className="text-[10px] text-[#acacac]">&nbsp;· Permissions can be configured in Builder</span>
            </div>
          </div>

          {/* ── Policy ──────────────────────────────── */}
          <div className="mb-[24px]">
            <div className="flex items-center gap-[6px] mb-[8px]">
              <SectionLabel>Policy</SectionLabel>
              <span className="text-[10px] italic text-[#acacac]">Optional — fine-tune in Builder</span>
            </div>

            {/* Threshold + Cost + Timeout */}
            <div className="flex items-start gap-[20px] mb-[16px]">
              {/* Auto-approve threshold */}
              <div className="w-[110px] flex flex-col gap-[6px]">
                <FieldLabel>
                  <span className="leading-[13.5px]">Auto-approve</span><br />
                  <span className="leading-[13.5px]">threshold</span>
                </FieldLabel>
                <div className="flex items-center justify-center w-[90px] h-[40px] rounded-[8px] bg-[#f5f5f0]">
                  <span className="text-[14px] font-bold font-mono text-[#e74c3c]">{form.autoApproveThreshold.toFixed(2)}</span>
                </div>
                <SliderTrack
                  value={form.autoApproveThreshold}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => update('autoApproveThreshold', v)}
                  color="#e74c3c"
                />
              </div>

              {/* Max cost per run */}
              <div className="flex flex-col gap-[6px]">
                <FieldLabel>Max cost per run</FieldLabel>
                <div className="flex items-center h-[40px] px-[12px] rounded-[8px] bg-[#f5f5f0] gap-[4px]">
                  <span className="text-[13px] text-[#acacac]">$</span>
                  <input
                    type="text"
                    value={form.maxCostPerRun}
                    onChange={(e) => update('maxCostPerRun', e.target.value)}
                    className="w-[60px] bg-transparent text-[14px] font-mono text-[#1a1a1a] border-0 focus:outline-none"
                  />
                </div>
                <HintText>USD</HintText>
              </div>

              {/* Timeout */}
              <div className="flex flex-col gap-[6px]">
                <FieldLabel>Timeout</FieldLabel>
                <div className="flex items-center h-[40px] px-[12px] rounded-[8px] bg-[#f5f5f0]">
                  <input
                    type="text"
                    value={form.timeout}
                    onChange={(e) => update('timeout', e.target.value)}
                    className="w-[50px] bg-transparent text-[14px] font-mono text-[#1a1a1a] border-0 focus:outline-none"
                  />
                </div>
                <HintText>seconds</HintText>
              </div>
            </div>

            {/* Requires approval for */}
            <div className="mb-[16px]">
              <FieldLabel>Requires approval for:</FieldLabel>
              <div className="flex items-center gap-[6px] mt-[6px]">
                {APPROVAL_ACTIONS.map((action) => {
                  const active = form.approvalActions.includes(action.id);
                  const isDanger = action.id === 'delete';
                  const isWarn = action.id === 'write';
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => toggleApproval(action.id)}
                      className={cn(
                        'h-[26px] px-[12px] rounded-[6px] text-[11px] font-medium border transition-all',
                        active && isDanger && 'bg-[#e74c3c] text-white border-[#e74c3c]',
                        active && isWarn && 'bg-[#ff9800] text-white border-[#ff9800]',
                        active && !isDanger && !isWarn && 'bg-[#9c27b0] text-white border-[#9c27b0]',
                        !active && 'bg-[#f5f5f0] text-[#6b6b6b] border-[#e8e8e8] hover:border-[#d0d0d0]',
                      )}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Escalation rules */}
            <div>
              <FieldLabel>Escalation rules:</FieldLabel>
              <div className="flex flex-col gap-[8px] mt-[6px]">
                {form.escalationRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-[8px]">
                    <span className="text-[11px] text-[#6b6b6b] w-[16px]">If</span>
                    <select
                      value={rule.field}
                      onChange={(e) => updateRule(rule.id, { field: e.target.value as EscalationRule['field'] })}
                      className="h-[30px] px-[8px] rounded-[6px] bg-[#f5f5f0] text-[11px] text-[#1a1a1a] border-0 focus:outline-none cursor-pointer"
                    >
                      <option value="confidence">confidence</option>
                      <option value="cost">cost</option>
                    </select>
                    <select
                      value={rule.operator}
                      onChange={(e) => updateRule(rule.id, { operator: e.target.value as EscalationRule['operator'] })}
                      className="h-[30px] w-[36px] px-[6px] rounded-[6px] bg-[#f5f5f0] text-[11px] text-[#1a1a1a] border-0 focus:outline-none cursor-pointer text-center"
                    >
                      <option value="<">&lt;</option>
                      <option value=">">&gt;</option>
                    </select>
                    <input
                      type="text"
                      value={rule.field === 'cost' ? `$${rule.value}` : rule.value}
                      onChange={(e) => updateRule(rule.id, { value: e.target.value.replace('$', '') })}
                      className="h-[30px] w-[56px] px-[8px] rounded-[6px] bg-[#f5f5f0] text-[11px] font-mono text-[#1a1a1a] border-0 focus:outline-none"
                    />
                    <span className="text-[11px] text-[#acacac]">&rarr;</span>
                    <span className={cn(
                      'h-[24px] px-[10px] rounded-full text-[10px] font-medium flex items-center',
                      rule.action === 'Reject' ? 'bg-[#ffebee] text-[#e74c3c]' : 'bg-[#fff3e0] text-[#ff9800]',
                    )}>
                      {rule.action}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      className="w-[24px] h-[24px] flex items-center justify-center rounded-[6px] text-[#acacac] hover:text-[#e74c3c] hover:bg-[#ffebee] transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addRule}
                  className="flex items-center gap-[4px] text-[11px] font-medium text-[#9c27b0] hover:text-[#7b1fa2] transition-colors mt-[2px]"
                >
                  <Plus size={12} /> Add rule
                </button>
              </div>
            </div>
          </div>

          {/* ── Constraints ─────────────────────────── */}
          <div className="mb-[24px]">
            <SectionLabel className="mb-[10px] block">Constraints</SectionLabel>
            <div className="flex items-start gap-[24px]">
              <ConstraintCounter label="Max Retries" value={form.maxRetries} onChange={(v) => update('maxRetries', v)} />
              <ConstraintCounter label="Max Iterations" value={form.maxIterations} onChange={(v) => update('maxIterations', v)} />
              <ConstraintCounter label="Max Tool Calls" value={form.maxToolCalls} onChange={(v) => update('maxToolCalls', v)} />
            </div>
          </div>

          {/* ── Tags & Project ──────────────────────── */}
          <div className="mb-[24px]">
            <SectionLabel className="mb-[10px] block">Tags & Project</SectionLabel>
            <div className="grid grid-cols-2 gap-[16px]">
              {/* Tags */}
              <div className="flex items-center gap-[6px] h-[40px] px-[12px] rounded-[8px] bg-[#f5f5f0]">
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-[4px] h-[24px] px-[8px] rounded-full bg-white border border-[#e8e8e8] text-[11px] text-[#1a1a1a]">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-[#acacac] hover:text-[#6b6b6b]">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Add tags..."
                  className="flex-1 bg-transparent text-[11px] text-[#1a1a1a] placeholder:text-[#acacac] border-0 focus:outline-none min-w-[60px]"
                />
              </div>

              {/* Project */}
              <div className="relative">
                <select
                  value={form.project}
                  onChange={(e) => update('project', e.target.value)}
                  className="w-full h-[40px] px-[12px] pr-[36px] rounded-[8px] bg-[#f5f5f0] text-[12px] text-[#1a1a1a] border-0 appearance-none cursor-pointer focus:outline-none"
                >
                  <option>Default Project</option>
                  <option>Engineering</option>
                  <option>Research</option>
                </select>
                <ChevronDown size={14} className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#acacac] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ── Agent Summary ───────────────────────── */}
          <div className="rounded-[12px] bg-[#faf5ff] border border-[#e1bee7] p-[20px]">
            <div className="flex items-center gap-[8px] mb-[10px]">
              <div className="w-[24px] h-[24px] rounded-[8px] bg-[#9c27b0]/10 flex items-center justify-center">
                <Brain size={14} className="text-[#9c27b0]" />
              </div>
              <span className="text-[13px] font-semibold text-[#1a1a1a]">Agent Summary</span>
            </div>
            <div className="flex flex-wrap gap-[6px] mb-[10px]">
              {summaryTags.map((tag) => (
                <span key={tag} className="h-[22px] px-[8px] rounded-full bg-[#9c27b0] text-white text-[10px] font-medium flex items-center">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-[#6b6b6b]">
              Agent will be created as v1 draft · Full configuration available in Builder
            </p>
          </div>
        </div>

        {/* ── Sticky Footer ─────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between h-[64px] px-[24px] border-t border-[#ece9e3] bg-white">
          {/* Left summary */}
          <div className="flex items-center gap-[8px]">
            <div className="w-[20px] h-[20px] rounded-[6px] bg-[#f3e5f9] flex items-center justify-center">
              <Brain size={12} className="text-[#9c27b0]" />
            </div>
            <span className="text-[11px] text-[#6b6b6b]">
              {form.selectedTools.length} tools · {selectedProvider.name} {selectedProvider.model.split(' ')[0]} · Threshold {form.autoApproveThreshold}
            </span>
          </div>

          {/* Right buttons */}
          <div className="flex items-center gap-[10px]">
            <button
              type="button"
              onClick={onClose}
              className="h-[36px] px-[16px] text-[12px] text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSubmit?.({ ...form })}
              className="h-[36px] px-[20px] rounded-[8px] border border-[#e8e8e8] bg-white text-[12px] font-medium text-[#1a1a1a] hover:bg-[#f5f5f0] transition-colors"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => onSubmit?.({ ...form })}
              className="h-[36px] px-[20px] rounded-[8px] bg-[#9c27b0] text-white text-[12px] font-semibold flex items-center gap-[6px] hover:bg-[#7b1fa2] transition-colors shadow-sm"
            >
              Create Agent
              <Check size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
