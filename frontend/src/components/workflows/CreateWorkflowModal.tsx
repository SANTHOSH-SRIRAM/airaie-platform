import { useCallback, useEffect, useState } from 'react';
import {
  X, Zap, Clock, CircleDot, MousePointerClick,
  ArrowRight, Folder, Info,
} from 'lucide-react';
import { cn } from '@utils/cn';

// ── Types ────────────────────────────────────────────────────

type StartFrom = 'blank' | 'template' | 'yaml';
type TriggerType = 'webhook' | 'schedule' | 'event' | 'manual';

interface CreateWorkflowFormData {
  name: string;
  description: string;
  startFrom: StartFrom;
  trigger: TriggerType;
  tags: string[];
  project: string;
}

interface CreateWorkflowModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: CreateWorkflowFormData) => void;
}

// ── Data ─────────────────────────────────────────────────────

interface StartOption {
  id: StartFrom;
  title: string;
  description: string;
}

const START_OPTIONS: StartOption[] = [
  {
    id: 'blank',
    title: 'Blank Canvas',
    description: 'Start from scratch with an empty workflow',
  },
  {
    id: 'template',
    title: 'From Template',
    description: 'Choose a pre-built workflow template',
  },
  {
    id: 'yaml',
    title: 'Import YAML',
    description: 'Upload a YAML DSL workflow definition',
  },
];

const TRIGGER_OPTIONS: { id: TriggerType; icon: typeof Zap; label: string }[] = [
  { id: 'webhook', icon: Zap, label: 'Webhook' },
  { id: 'schedule', icon: Clock, label: 'Schedule' },
  { id: 'event', icon: CircleDot, label: 'Event' },
  { id: 'manual', icon: MousePointerClick, label: 'Manual' },
];

const INITIAL_FORM: CreateWorkflowFormData = {
  name: '',
  description: '',
  startFrom: 'blank',
  trigger: 'webhook',
  tags: ['simulation'],
  project: 'Default Project',
};

// ── Workflow Node Glyph (matching design) ────────────────────

function WorkflowGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" rx="1.2" stroke="#2196F3" strokeWidth="1.5" />
      <rect x="2" y="15" width="5" height="5" rx="1.2" stroke="#FF9800" strokeWidth="1.5" />
      <rect x="15" y="15" width="5" height="5" rx="1.2" stroke="#2196F3" strokeWidth="1.5" />
      <path d="M7 4.5H11.5V15H15" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

// ── Start From Icons (pixel-matched to Figma) ───────────────

function BlankCanvasIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TemplateGridIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ImportYamlIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3v12m0-12L7 8m5-5l5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const START_ICONS: Record<StartFrom, (props: { className?: string }) => JSX.Element> = {
  blank: BlankCanvasIcon,
  template: TemplateGridIcon,
  yaml: ImportYamlIcon,
};

// ── Sub-components ───────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
      {children}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function CreateWorkflowModal({ open, onClose, onSubmit }: CreateWorkflowModalProps) {
  const [form, setForm] = useState<CreateWorkflowFormData>(INITIAL_FORM);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setForm(INITIAL_FORM);
      setTagInput('');
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

  const update = useCallback(<K extends keyof CreateWorkflowFormData>(key: K, val: CreateWorkflowFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New Workflow"
        className="relative flex flex-col w-full max-w-[720px] max-h-[calc(100vh-80px)] bg-white rounded-[16px] shadow-[0px_24px_48px_rgba(0,0,0,0.16)] overflow-hidden"
      >
        {/* ── Header ──────────────────────────────── */}
        <div className="shrink-0 flex flex-col gap-[6px] px-[32px] pt-[28px] pb-[21px] border-b border-[#f0f0ec]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[10px]">
              <WorkflowGlyph size={22} />
              <h2 className="text-[20px] font-semibold text-[#1a1a1a] leading-[22px]">New Workflow</h2>
            </div>
            <button
              onClick={onClose}
              className="w-[32px] h-[32px] flex items-center justify-center rounded-full bg-[#fafaf8] text-[#acacac] hover:text-[#6b6b6b] hover:bg-[#f0f0ec] transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-[13px] font-medium text-[#6b6b6b] leading-[16.9px]">
            Create a new automation pipeline for your engineering tools
          </p>
        </div>

        {/* ── Scrollable Body ─────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-[32px] pt-[24px] pb-[24px] flex flex-col gap-[24px]">

          {/* ── Name ────────────────────────────────── */}
          <div className="flex flex-col gap-[8px]">
            <SectionLabel>Name</SectionLabel>
            <div className="h-[44px] px-[16px] rounded-[8px] bg-[#f5f5f0] flex items-center">
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. FEA Validation Pipeline"
                className="w-full bg-transparent text-[14px] text-[#1a1a1a] placeholder:text-[#acacac] border-0 focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-[#acacac]">Use a descriptive name for your workflow</span>
          </div>

          {/* ── Description ─────────────────────────── */}
          <div className="flex flex-col gap-[8px]">
            <div className="flex items-center gap-[8px]">
              <SectionLabel>Description</SectionLabel>
              <span className="text-[9px] italic text-[#acacac]">Optional</span>
            </div>
            <div className="relative">
              <textarea
                value={form.description}
                onChange={(e) => { if (e.target.value.length <= 300) update('description', e.target.value); }}
                placeholder="What does this workflow do?"
                className="w-full min-h-[72px] px-[16px] pt-[12px] pb-[28px] rounded-[8px] bg-[#f5f5f0] text-[13px] text-[#1a1a1a] placeholder:text-[#acacac] resize-none border-0 focus:outline-none"
              />
              <span className="absolute bottom-[10px] right-[14px] text-[9px] text-[#acacac] font-mono">
                {form.description.length} / 300
              </span>
            </div>
          </div>

          {/* ── Start From ──────────────────────────── */}
          <div className="flex flex-col gap-[8px]">
            <SectionLabel>Start From</SectionLabel>
            <div className="grid grid-cols-3 gap-[10px]">
              {START_OPTIONS.map((opt) => {
                const selected = form.startFrom === opt.id;
                const StartIcon = START_ICONS[opt.id];
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update('startFrom', opt.id)}
                    className={cn(
                      'relative flex flex-col gap-[7px] items-start h-[120px] p-[17px] rounded-[10px] border text-left transition-all',
                      selected
                        ? 'bg-[#f8fcff] border-[#2196f3] shadow-[0px_0px_0px_3px_rgba(33,150,243,0.06)]'
                        : 'bg-white border-[#e8e8e8] hover:border-[#d0d0d0]'
                    )}
                  >
                    <StartIcon
                      className={cn(selected ? 'text-[#2196f3]' : 'text-[#6b6b6b]')}
                    />
                    <span className="text-[13px] font-semibold text-[#1a1a1a] leading-[15.6px]">{opt.title}</span>
                    <span className="text-[11px] text-[#6b6b6b] leading-[15.95px]">{opt.description}</span>

                    {/* Radio indicator */}
                    <div
                      className={cn(
                        'absolute bottom-[14px] right-[14px] w-[14px] h-[14px] rounded-full border',
                        selected
                          ? 'bg-[#2196f3] border-[#2196f3] shadow-[inset_0px_0px_0px_3px_white]'
                          : 'bg-white border-[#d0d0d0]'
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Initial Trigger ──────────────────────── */}
          <div className="flex flex-col gap-[8px]">
            <SectionLabel>Initial Trigger</SectionLabel>
            <div className="flex items-center gap-[8px]">
              {TRIGGER_OPTIONS.map((opt) => {
                const selected = form.trigger === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update('trigger', opt.id)}
                    className={cn(
                      'relative flex items-center gap-[6px] h-[40px] px-[17px] rounded-[8px] border text-[12px] transition-all',
                      selected
                        ? 'bg-[#f8fcff] border-[#2196f3] text-[#1a1a1a]'
                        : 'bg-white border-[#e8e8e8] text-[#6b6b6b] hover:border-[#d0d0d0]'
                    )}
                  >
                    <Icon size={14} strokeWidth={1.8} className={selected ? 'text-[#2196f3]' : 'text-[#acacac]'} />
                    <span>{opt.label}</span>
                    {selected && (
                      <div className="absolute top-[8px] right-[8px] w-[6px] h-[6px] rounded-[3px] bg-[#2196f3]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Tags ─────────────────────────────────── */}
          <div className="flex flex-col gap-[8px]">
            <div className="flex items-center gap-[8px]">
              <SectionLabel>Tags</SectionLabel>
              <span className="text-[9px] italic text-[#acacac]">Optional</span>
            </div>
            <div className="flex items-center gap-[8px] h-[40px] px-[12px] rounded-[8px] bg-[#f5f5f0]">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-[6px] h-[24px] px-[9px] rounded-[4px] bg-white border border-[#e8e8e8] text-[11px] text-[#6b6b6b]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-[#acacac] hover:text-[#6b6b6b] transition-colors"
                  >
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
          </div>

          {/* ── Project ──────────────────────────────── */}
          <div className="flex flex-col gap-[8px]">
            <SectionLabel>Project</SectionLabel>
            <div className="relative">
              <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#acacac]">
                <Folder size={14} />
              </div>
              <select
                value={form.project}
                onChange={(e) => update('project', e.target.value)}
                className="w-full h-[44px] pl-[34px] pr-[36px] rounded-[8px] bg-[#f5f5f0] text-[13px] text-[#1a1a1a] border-0 appearance-none cursor-pointer focus:outline-none"
              >
                <option>Default Project</option>
                <option>Engineering</option>
                <option>Research</option>
              </select>
              <svg
                className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[#acacac] pointer-events-none"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between h-[64px] px-[32px] border-t border-[#f0f0ec] bg-white">
          {/* Left info */}
          <div className="flex items-center gap-[6px] text-[11px] text-[#acacac]">
            <Info size={12} className="text-[#d0d0d0]" />
            <span>Workflow will be created as <span className="font-medium text-[#6b6b6b]">v1 draft</span></span>
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
              className="h-[40px] px-[24px] rounded-[8px] bg-[#2196f3] text-white text-[13px] font-semibold flex items-center gap-[8px] hover:bg-[#1976d2] transition-colors shadow-sm"
            >
              Create Workflow
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
