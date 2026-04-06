import { createElement, useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  ArrowUpRight,
  BarChart3,
  Binary,
  Box,
  BrainCircuit,
  Calculator,
  ChevronDown,
  Combine,
  Container,
  Database,
  FileCode2,
  FlaskConical,
  Globe,
  Grid2X2,
  Paperclip,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  Thermometer,
  Wind,
  Wrench,
} from 'lucide-react';
import { useUiStore } from '@store/uiStore';
import { useToolList } from '@hooks/useTools';
import Button from '@components/ui/Button';
import RegisterToolModal from '@components/tools/RegisterToolModal';
import { cn } from '@utils/cn';
import type { Tool, ToolAdapter, ToolCategory, ToolContractField, ToolStatus } from '@/types/tool';

const CATEGORY_OPTIONS: { value: 'all' | ToolCategory; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'simulation', label: 'Simulation' },
  { value: 'meshing', label: 'Meshing' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'materials', label: 'Materials' },
  { value: 'ml-ai', label: 'ML / AI' },
  { value: 'utilities', label: 'Utilities' },
];

const STATUS_OPTIONS: { value: 'all' | ToolStatus; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'deprecated', label: 'Deprecated' },
];

const ADAPTER_OPTIONS: { value: 'all' | ToolAdapter; label: string }[] = [
  { value: 'all', label: 'All Adapters' },
  { value: 'docker', label: 'Docker' },
  { value: 'python', label: 'Python' },
  { value: 'wasm', label: 'WASM' },
  { value: 'remote-api', label: 'Remote API' },
];

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

const TOOL_ICON_MAP = {
  FlaskConical,
  Wind,
  Grid2X2,
  Database,
  BarChart3,
  Box,
  Paperclip,
  Thermometer,
  Calculator,
  Scale,
  BrainCircuit,
  Archive,
  Combine,
  ShieldCheck,
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

function ToolGlyph({
  icon,
  status,
}: {
  icon: string;
  status: ToolStatus;
}) {
  return createElement(getToolIcon(icon), {
    size: 16,
    className: cn('mt-0.5 shrink-0', status === 'draft' ? 'text-[#ff9800]' : 'text-[#2196f3]'),
  });
}

function AdapterGlyph({
  adapter,
  size = 10,
}: {
  adapter: ToolAdapter;
  size?: number;
}) {
  return createElement(ADAPTER_ICON_MAP[adapter], { size });
}

function formatFieldType(type: string) {
  if (type.startsWith('enum')) return 'enum';
  return type;
}

function formatDuration(seconds: number | undefined) {
  if (!seconds) return '0s';
  return `${seconds}s`;
}

function SelectDropdown<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex h-9 w-full items-center justify-between rounded-[8px] bg-[#f5f5f0] px-3 text-[12px] text-[#6b6b6b] shadow-[inset_0_0_0_1px_rgba(236,233,227,0.95)] transition-colors hover:bg-[#f0f0ec]"
      >
        <span>{selected?.label}</span>
        <ChevronDown size={14} className="text-[#acacac]" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close dropdown"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-2 min-w-full overflow-hidden rounded-[10px] border border-[#ece9e3] bg-white py-1 shadow-[0px_12px_28px_rgba(26,26,26,0.08)]">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center px-3 py-2 text-left text-[12px] transition-colors',
                  option.value === value
                    ? 'bg-[#f5f5f0] text-[#1a1a1a]'
                    : 'text-[#6b6b6b] hover:bg-[#f8f8f7]'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ToolStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center rounded-[6px] px-2 text-[10px] font-medium',
        status === 'published' && 'bg-[#e8f5e9] text-[#4caf50]',
        status === 'draft' && 'bg-[#fff3e0] text-[#ff9800]',
        status === 'deprecated' && 'bg-[#ffebee] text-[#e74c3c]'
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function CategoryPill({ category }: { category: ToolCategory }) {
  return (
    <span className="inline-flex h-[22px] items-center rounded-[4px] bg-[#f0f0ec] px-2 text-[10px] text-[#6b6b6b]">
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function AdapterBadge({ adapter }: { adapter: ToolAdapter }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-[#6b6b6b]">
      <AdapterGlyph adapter={adapter} />
      {ADAPTER_LABELS[adapter]}
    </span>
  );
}

function ContractList({
  label,
  fields,
  bulletClassName,
}: {
  label: string;
  fields: ToolContractField[];
  bulletClassName: string;
}) {
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
            <span className="shrink-0 text-[10px] text-[#acacac]">{formatFieldType(field.type)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-[#6b6b6b]">{label}</span>
      <div className={cn('max-w-[150px] text-right text-[11px] text-[#1a1a1a]', valueClassName)}>
        {value}
      </div>
    </div>
  );
}

function LimitCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'alert';
}) {
  return (
    <div className="flex min-h-[54px] flex-col gap-[6px] rounded-[8px] bg-[#f5f5f0] px-2 py-2">
      <span className="text-[10px] text-[#acacac]">{label}</span>
      {tone === 'alert' ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center self-start rounded-full bg-[#e74c3c] px-1.5 text-[10px] text-white">
          {value}
        </span>
      ) : (
        <span className="font-mono text-[10px] text-[#1a1a1a]">{value}</span>
      )}
    </div>
  );
}

function ToolRegistryRow({
  tool,
  selected,
  onSelect,
}: {
  tool: Tool;
  selected: boolean;
  onSelect: (toolId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      className={cn(
        'relative grid w-full grid-cols-[minmax(260px,1.9fr)_84px_94px_96px_92px_48px] items-center gap-4 px-6 py-[13px] text-left transition-colors',
        selected ? 'bg-[#fbfaf8]' : 'hover:bg-[#fbfaf9]'
      )}
    >
      {selected && <span className="absolute inset-y-0 left-0 w-[3px] bg-[#2196f3]" />}

      <div className="flex min-w-0 items-start gap-3">
        <ToolGlyph icon={tool.icon} status={tool.status} />
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-[#1a1a1a]">{tool.name}</div>
          <div className="truncate text-[10px] text-[#6b6b6b]">{tool.description}</div>
        </div>
      </div>

      <div className="font-mono text-[11px] text-[#1a1a1a]">{tool.currentVersion}</div>
      <div>
        <StatusPill status={tool.status} />
      </div>
      <div>
        <CategoryPill category={tool.category} />
      </div>
      <div>
        <AdapterBadge adapter={tool.adapter} />
      </div>
      <div className="text-[11px] text-[#6b6b6b]">
        {tool.contract.inputs.length} → {tool.contract.outputs.length}
      </div>
    </button>
  );
}

function TableHeader() {
  return (
    <div className="grid grid-cols-[minmax(260px,1.9fr)_84px_94px_96px_92px_48px] gap-4 border-b border-[#f0f0ec] px-6 py-[11px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
      <span>Tool Name</span>
      <span>Version</span>
      <span>Status</span>
      <span>Category</span>
      <span>Adapter</span>
      <span>I/O</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-[1116px] px-4 pb-8">
      <div className="space-y-4">
        <div className="h-[72px] rounded-[12px] bg-white shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_282px]">
          <div className="h-[652px] rounded-[12px] bg-white shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]" />
          <div className="h-[652px] rounded-[12px] bg-white shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]" />
        </div>
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="mx-auto w-full max-w-[1116px] px-4 pb-8">
      <div className="flex min-h-[320px] items-center justify-center rounded-[12px] bg-white text-[13px] text-[#6b6b6b] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
        Failed to load tools.
      </div>
    </div>
  );
}

export default function ToolRegistryPage() {
  const navigate = useNavigate();
  const setSidebarContentType = useUiStore((state) => state.setSidebarContentType);
  const hideBottomBar = useUiStore((state) => state.hideBottomBar);
  const closeRightPanel = useUiStore((state) => state.closeRightPanel);
  const { data: allTools, isLoading, isError } = useToolList();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ToolCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ToolStatus>('all');
  const [adapterFilter, setAdapterFilter] = useState<'all' | ToolAdapter>('all');
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const handleUseInWorkflow = useCallback((toolId: string) => {
    navigate(`/workflow-studio?addTool=${toolId}`);
  }, [navigate]);

  useEffect(() => {
    setSidebarContentType('navigation');
    hideBottomBar();
    closeRightPanel();

    return () => {
      hideBottomBar();
      closeRightPanel();
    };
  }, [closeRightPanel, hideBottomBar, setSidebarContentType]);

  const filteredTools = useMemo(() => {
    if (!allTools) return [];

    return allTools.filter((tool) => {
      if (categoryFilter !== 'all' && tool.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && tool.status !== statusFilter) return false;
      if (adapterFilter !== 'all' && tool.adapter !== adapterFilter) return false;
      if (!search) return true;

      const query = search.toLowerCase();
      return (
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.adapter.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query)
      );
    });
  }, [adapterFilter, allTools, categoryFilter, search, statusFilter]);

  const activeToolId =
    selectedToolId && filteredTools.some((tool) => tool.id === selectedToolId)
      ? selectedToolId
      : filteredTools[0]?.id ?? null;

  const selectedTool =
    filteredTools.find((tool) => tool.id === activeToolId) ??
    allTools?.find((tool) => tool.id === activeToolId) ??
    null;

  const totalTools = allTools?.length ?? 0;
  const publishedCount = allTools?.filter((tool) => tool.status === 'published').length ?? 0;
  const draftCount = allTools?.filter((tool) => tool.status === 'draft').length ?? 0;
  const deprecatedCount = allTools?.filter((tool) => tool.status === 'deprecated').length ?? 0;
  const adapterCount = new Set((allTools ?? []).map((tool) => tool.adapter)).size;

  if (isLoading) return <LoadingState />;
  if (isError || !allTools) return <ErrorState />;

  return (
    <div className="mx-auto w-full max-w-[1116px] px-4 pb-8">
      <div className="space-y-4">
        <section className="flex min-h-[72px] flex-col gap-4 rounded-[12px] bg-white px-4 py-4 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div className="flex items-center gap-3">
            <Wrench size={18} className="text-[#2196f3]" />
            <h1 className="text-[20px] font-semibold leading-[22px] text-[#1a1a1a]">Tool Registry</h1>
            <span className="inline-flex h-[22px] items-center rounded-[8px] bg-[#f0f0ec] px-[10px] text-[11px] font-medium text-[#acacac]">
              {totalTools} tools
            </span>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            <label className="relative flex h-9 w-full max-w-[180px] items-center rounded-[8px] bg-[#f5f5f0] px-3 shadow-[inset_0_0_0_1px_rgba(236,233,227,0.95)]">
              <Search size={14} className="shrink-0 text-[#acacac]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tools..."
                className="w-full bg-transparent pl-2 text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none"
              />
            </label>

            <SelectDropdown
              value={categoryFilter}
              options={CATEGORY_OPTIONS}
              onChange={setCategoryFilter}
              className="w-[128px]"
            />
            <SelectDropdown
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={setStatusFilter}
              className="w-[104px]"
            />
            <SelectDropdown
              value={adapterFilter}
              options={ADAPTER_OPTIONS}
              onChange={setAdapterFilter}
              className="w-[116px]"
            />

            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowRegisterModal(true)}
              className="h-9 rounded-[8px] bg-[#2d2d2d] px-[14px] text-[13px] font-medium text-white shadow-none hover:bg-[#242424]"
            >
              Register Tool
            </Button>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_282px]">
          <div className="flex h-[652px] flex-col overflow-hidden rounded-[12px] bg-white shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
            <TableHeader />

            {filteredTools.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-[#6b6b6b]">
                No tools match your filters.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {filteredTools.map((tool) => (
                  <ToolRegistryRow
                    key={tool.id}
                    tool={tool}
                    selected={tool.id === selectedTool?.id}
                    onSelect={setSelectedToolId}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#f0f0ec] px-6 py-3 text-[10px] text-[#acacac]">
              <span>
                Showing {filteredTools.length} of {totalTools} tools
              </span>
              <div className="flex items-center gap-4">
                <span>Previous</span>
                <span>Page 1 of 1</span>
                <span>Next</span>
              </div>
            </div>
          </div>

          <aside className="flex h-[652px] flex-col overflow-hidden rounded-[12px] bg-white shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
            {selectedTool ? (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Quick View</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUseInWorkflow(selectedTool.id)}
                      className="inline-flex items-center gap-1 text-[12px] text-[#4caf50] hover:text-[#388e3c] transition-colors"
                    >
                      Use in Workflow
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[12px] text-[#2196f3]"
                    >
                      Open Full
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Tool</div>
                    <div className="mt-1 text-[14px] font-semibold text-[#1a1a1a]">{selectedTool.name}</div>
                    <div className="mt-2 inline-flex h-[22px] items-center gap-1 rounded-[6px] bg-[#e3f2fd] px-2 text-[10px] font-medium text-[#2196f3]">
                      <Wrench size={10} />
                      Tool
                    </div>
                    <div className="mt-2 text-[12px] text-[#6b6b6b]">
                      {selectedTool.currentVersion} · {STATUS_LABELS[selectedTool.status]}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Description</div>
                    <p className="mt-2 text-[12px] leading-[17px] text-[#6b6b6b]">
                      {selectedTool.detailDescription ?? selectedTool.description}
                    </p>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Contract</div>
                    <div className="mt-2 space-y-3">
                      <ContractList
                        label="Inputs"
                        fields={selectedTool.contract.inputs}
                        bulletClassName="bg-[#2196f3]"
                      />
                      <ContractList
                        label="Outputs"
                        fields={selectedTool.contract.outputs}
                        bulletClassName="bg-[#4caf50]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Execution</div>
                    <div className="mt-2 space-y-2">
                      <DetailRow
                        label="Adapter"
                        value={
                          <span className="inline-flex items-center gap-1.5">
                            <AdapterGlyph adapter={selectedTool.adapter} size={12} />
                            {ADAPTER_LABELS[selectedTool.adapter]}
                          </span>
                        }
                      />
                      <DetailRow label="Image" value={selectedTool.image} valueClassName="font-mono text-[10px]" />
                      <DetailRow
                        label="Network"
                        value={
                          <span
                            className={cn(
                              'inline-flex h-5 items-center rounded-full px-2 text-[10px] text-white',
                              selectedTool.sandboxNetwork === 'deny' ? 'bg-[#e74c3c]' : 'bg-[#4caf50]'
                            )}
                          >
                            {selectedTool.sandboxNetwork}
                          </span>
                        }
                      />
                      <DetailRow
                        label="Filesystem"
                        value={
                          <span className="inline-flex h-5 items-center rounded-full bg-[#ff9800] px-2 text-[10px] text-white">
                            {selectedTool.filesystemMode ?? 'sandbox'}
                          </span>
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Limits</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <LimitCard label="CPU" value={selectedTool.limits.cpu} tone="alert" />
                      <LimitCard label="Mem" value={`${selectedTool.limits.memoryMb} MB`} />
                      <LimitCard label="Timeout" value={`${selectedTool.limits.timeoutSeconds}s`} />
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Usage</div>
                    <div className="mt-2 space-y-2">
                      <DetailRow label="Total runs" value={selectedTool.usageCount} valueClassName="font-mono" />
                      <DetailRow
                        label="Success rate"
                        value={`${selectedTool.successRate ?? 0}%`}
                        valueClassName="font-mono text-[#4caf50]"
                      />
                      <DetailRow
                        label="Avg duration"
                        value={formatDuration(selectedTool.avgDurationSeconds)}
                        valueClassName="font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-[#6b6b6b]">
                Select a tool to view details.
              </div>
            )}
          </aside>
        </section>

        <div className="flex justify-center pt-1">
          <div className="inline-flex h-9 items-center gap-2 rounded-[12px] bg-white px-3.5 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
            <span className="h-[6px] w-[6px] rounded-[3px] bg-[#4caf50]" />
            <span className="text-[11px] font-medium text-[#4caf50]">System Operational</span>
            <span className="text-[10px] font-medium text-[#d0d0d0]">·</span>
            <span className="text-[10px] font-medium text-[#6b6b6b]">{totalTools} tools</span>
            <span className="text-[10px] font-medium text-[#d0d0d0]">·</span>
            <span className="text-[10px] font-medium text-[#6b6b6b]">
              {publishedCount} published · {draftCount} draft · {deprecatedCount} deprecated
            </span>
            <span className="text-[10px] font-medium text-[#d0d0d0]">·</span>
            <span className="text-[10px] font-medium text-[#2196f3]">{adapterCount} adapters</span>
          </div>
        </div>
      </div>

      <RegisterToolModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
      />
    </div>
  );
}
