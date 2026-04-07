import { createElement } from 'react';
import { Link } from 'react-router-dom';
import {
  X, ArrowUpRight, Wrench,
  Container, FileCode2, Binary, Globe,
  FlaskConical, Wind, Grid2X2, Database, BarChart3, Box, Paperclip,
  Thermometer, Calculator, Scale, BrainCircuit, Archive, Combine, ShieldCheck,
  ChevronDown, Shield,
} from 'lucide-react';
import { cn } from '@utils/cn';
import type { Tool, ToolAdapter, ToolCategory, ToolStatus, ToolContractField, TrustLevel } from '@/types/tool';

// ── Label Maps ────────────────────────────────────────────────

const STATUS_LABELS: Record<ToolStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  deprecated: 'Deprecated',
};

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  simulation: 'Simulation',
  meshing: 'Meshing',
  analysis: 'Analysis',
  materials: 'Materials',
  'ml-ai': 'ML / AI',
  utilities: 'Utilities',
};

const ADAPTER_LABELS: Record<ToolAdapter, string> = {
  docker: 'Docker',
  python: 'Python',
  wasm: 'WASM',
  'remote-api': 'Remote API',
};

const TRUST_CONFIG: Record<TrustLevel, { bg: string; text: string; label: string }> = {
  untested:  { bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]', label: 'Untested' },
  community: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]', label: 'Community' },
  tested:    { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]', label: 'Tested' },
  verified:  { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]', label: 'Verified' },
  certified: { bg: 'bg-[#f3e5f9]', text: 'text-[#9c27b0]', label: 'Certified' },
};

// ── Icon Maps ────────────────────────────────────────────────

const TOOL_ICON_MAP = {
  FlaskConical, Wind, Grid2X2, Database, BarChart3, Box, Paperclip,
  Thermometer, Calculator, Scale, BrainCircuit, Archive, Combine, ShieldCheck,
} as const;

const ADAPTER_ICON_MAP: Record<ToolAdapter, typeof Container> = {
  docker: Container,
  python: FileCode2,
  wasm: Binary,
  'remote-api': Globe,
};

function getToolIcon(name: string) {
  return TOOL_ICON_MAP[name as keyof typeof TOOL_ICON_MAP] ?? Wrench;
}

// ── Sub-components ────────────────────────────────────────────

function DetailRow({ label, value, valueClassName }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-[#6b6b6b]">{label}</span>
      <div className={cn('max-w-[150px] text-right text-[11px] text-[#1a1a1a]', valueClassName)}>
        {value}
      </div>
    </div>
  );
}

function ContractList({ label, fields, bulletClassName }: { label: string; fields: ToolContractField[]; bulletClassName: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-[11px] text-[#6b6b6b]">
        <span>{label}</span>
        {label === 'Inputs' && <ChevronDown size={12} className="text-[#acacac]" />}
      </div>
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.name} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className={cn('h-[6px] w-[6px] shrink-0 rounded-[3px]', bulletClassName)} />
              <span className="truncate font-mono text-[10px] text-[#1a1a1a]">{field.name}</span>
            </div>
            <span className="shrink-0 text-[10px] text-[#acacac]">{field.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDuration(seconds: number | undefined) {
  if (!seconds) return '0s';
  return `${seconds}s`;
}

// ── Main Component ────────────────────────────────────────────

interface QuickInspectorProps {
  tool: Tool | null;
  onClose: () => void;
  onUseInWorkflow?: (toolId: string) => void;
}

export default function QuickInspector({ tool, onClose, onUseInWorkflow }: QuickInspectorProps) {
  if (!tool) return null;

  const trustLevel: TrustLevel = tool.status === 'published' ? 'verified' : 'untested';
  const trustCfg = TRUST_CONFIG[trustLevel];

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close inspector"
        className="fixed inset-0 bg-black/10 cursor-default"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative ml-auto h-full w-[340px] bg-white shadow-[-4px_0px_24px_rgba(0,0,0,0.08)] flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0ec]">
          <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Quick Inspector</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-[4px] hover:bg-[#f0f0ec] rounded-[6px] transition-colors"
          >
            <X size={16} className="text-[#6b6b6b]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            {/* Tool Identity */}
            <div>
              <div className="flex items-start gap-3">
                {createElement(getToolIcon(tool.icon), {
                  size: 20,
                  className: cn('shrink-0 mt-0.5', tool.status === 'draft' ? 'text-[#ff9800]' : 'text-[#2196f3]'),
                })}
                <div>
                  <div className="text-[14px] font-semibold text-[#1a1a1a]">{tool.name}</div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex h-[22px] items-center gap-1 rounded-[6px] bg-[#e3f2fd] px-2 text-[10px] font-medium text-[#2196f3]">
                      <Wrench size={10} />
                      Tool
                    </span>
                    <span className={cn('inline-flex h-[22px] items-center gap-1 rounded-[6px] px-2 text-[10px] font-medium', trustCfg.bg, trustCfg.text)}>
                      <Shield size={10} />
                      {trustCfg.label}
                    </span>
                  </div>
                  <div className="mt-2 text-[12px] text-[#6b6b6b]">
                    {tool.currentVersion} · {STATUS_LABELS[tool.status]}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Description</div>
              <p className="mt-2 text-[12px] leading-[17px] text-[#6b6b6b]">
                {tool.detailDescription ?? tool.description}
              </p>
            </div>

            {/* Contract Summary */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Contract</div>
              <div className="mt-2 space-y-3">
                <ContractList label="Inputs" fields={tool.contract.inputs} bulletClassName="bg-[#2196f3]" />
                <ContractList label="Outputs" fields={tool.contract.outputs} bulletClassName="bg-[#4caf50]" />
              </div>
            </div>

            {/* Execution */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Execution</div>
              <div className="mt-2 space-y-2">
                <DetailRow
                  label="Adapter"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      {createElement(ADAPTER_ICON_MAP[tool.adapter], { size: 12 })}
                      {ADAPTER_LABELS[tool.adapter]}
                    </span>
                  }
                />
                <DetailRow label="Category" value={CATEGORY_LABELS[tool.category]} />
                <DetailRow label="Image" value={tool.image} valueClassName="font-mono text-[10px]" />
                <DetailRow
                  label="Network"
                  value={
                    <span
                      className={cn(
                        'inline-flex h-5 items-center rounded-full px-2 text-[10px] text-white',
                        tool.sandboxNetwork === 'deny' ? 'bg-[#e74c3c]' : 'bg-[#4caf50]'
                      )}
                    >
                      {tool.sandboxNetwork}
                    </span>
                  }
                />
              </div>
            </div>

            {/* Usage */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Usage</div>
              <div className="mt-2 space-y-2">
                <DetailRow label="Total runs" value={tool.usageCount} valueClassName="font-mono" />
                <DetailRow
                  label="Success rate"
                  value={`${tool.successRate ?? 0}%`}
                  valueClassName="font-mono text-[#4caf50]"
                />
                <DetailRow
                  label="Avg duration"
                  value={formatDuration(tool.avgDurationSeconds)}
                  valueClassName="font-mono"
                />
                <DetailRow
                  label="Cost / run"
                  value={`$${tool.costPerRun.toFixed(2)}`}
                  valueClassName="font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#f0f0ec] px-5 py-3 flex items-center gap-2">
          <Link
            to={`/tools/${tool.id}`}
            className="flex-1 h-[34px] rounded-[8px] bg-[#2d2d2d] text-white text-[12px] font-medium flex items-center justify-center gap-[6px] hover:bg-[#1a1a1a] transition-colors"
          >
            View Detail <ArrowUpRight size={12} />
          </Link>
          {onUseInWorkflow && (
            <button
              type="button"
              onClick={() => onUseInWorkflow(tool.id)}
              className="h-[34px] px-[14px] rounded-[8px] border border-[#e8e8e8] text-[12px] font-medium text-[#4caf50] hover:bg-[#f5f5f0] transition-colors"
            >
              Use in Workflow
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
