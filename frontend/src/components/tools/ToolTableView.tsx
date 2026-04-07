import { useState, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown, ArrowUp, ArrowDown,
  Container, FileCode2, Binary, Globe,
  FlaskConical, Wind, Grid2X2, Database, BarChart3, Box, Paperclip,
  Thermometer, Calculator, Scale, BrainCircuit, Archive, Combine, ShieldCheck,
  Wrench,
} from 'lucide-react';
import { cn } from '@utils/cn';
import type { Tool, ToolAdapter, ToolCategory, ToolStatus } from '@/types/tool';

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

// ── Sort Config ────────────────────────────────────────────────

type SortKey = 'name' | 'category' | 'adapter' | 'status' | 'trust' | 'successRate' | 'runs' | 'version';
type SortDir = 'asc' | 'desc';

const TRUST_ORDER: Record<string, number> = {
  certified: 5,
  verified: 4,
  tested: 3,
  community: 2,
  untested: 1,
};

function compareTool(a: Tool, b: Tool, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  switch (key) {
    case 'name':
      cmp = a.name.localeCompare(b.name);
      break;
    case 'category':
      cmp = a.category.localeCompare(b.category);
      break;
    case 'adapter':
      cmp = a.adapter.localeCompare(b.adapter);
      break;
    case 'status':
      cmp = a.status.localeCompare(b.status);
      break;
    case 'trust': {
      const aLevel = (a as unknown as { trust_level?: string }).trust_level ?? 'untested';
      const bLevel = (b as unknown as { trust_level?: string }).trust_level ?? 'untested';
      cmp = (TRUST_ORDER[aLevel] ?? 0) - (TRUST_ORDER[bLevel] ?? 0);
      break;
    }
    case 'successRate':
      cmp = (a.successRate ?? 0) - (b.successRate ?? 0);
      break;
    case 'runs':
      cmp = a.usageCount - b.usageCount;
      break;
    case 'version':
      cmp = a.currentVersion.localeCompare(b.currentVersion);
      break;
  }
  return dir === 'asc' ? cmp : -cmp;
}

// ── Column Header ────────────────────────────────────────────

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn('flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac] hover:text-[#6b6b6b] transition-colors', className)}
    >
      {label}
      {isActive ? (
        currentDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
      ) : (
        <ArrowUpDown size={10} className="opacity-40" />
      )}
    </button>
  );
}

// ── Table View ────────────────────────────────────────────────

interface ToolTableViewProps {
  tools: Tool[];
  selectedToolId: string | null;
  onSelectTool: (toolId: string) => void;
}

export default function ToolTableView({ tools, selectedToolId, onSelectTool }: ToolTableViewProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...tools].sort((a, b) => compareTool(a, b, sortKey, sortDir));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[minmax(200px,1.5fr)_80px_80px_80px_80px_70px_60px_70px] gap-3 border-b border-[#f0f0ec] px-6 py-[11px]">
        <SortableHeader label="Name" sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <SortableHeader label="Category" sortKey="category" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <SortableHeader label="Adapter" sortKey="adapter" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <SortableHeader label="Status" sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <SortableHeader label="Trust" sortKey="trust" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <SortableHeader label="Success" sortKey="successRate" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <SortableHeader label="Runs" sortKey="runs" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <SortableHeader label="Version" sortKey="version" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
      </div>

      {/* Table Body */}
      {sorted.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-[#6b6b6b]">
          No tools match your filters.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {sorted.map((tool) => {
            const isSelected = tool.id === selectedToolId;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onSelectTool(tool.id)}
                onDoubleClick={() => navigate(`/tools/${tool.id}`)}
                className={cn(
                  'relative grid w-full grid-cols-[minmax(200px,1.5fr)_80px_80px_80px_80px_70px_60px_70px] items-center gap-3 px-6 py-[12px] text-left transition-colors',
                  isSelected ? 'bg-[#fbfaf8]' : 'hover:bg-[#fbfaf9]'
                )}
              >
                {isSelected && <span className="absolute inset-y-0 left-0 w-[3px] bg-[#2196f3]" />}

                {/* Name */}
                <div className="flex min-w-0 items-start gap-2.5">
                  {createElement(getToolIcon(tool.icon), {
                    size: 14,
                    className: cn('mt-0.5 shrink-0', tool.status === 'draft' ? 'text-[#ff9800]' : 'text-[#2196f3]'),
                  })}
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-[#1a1a1a]">{tool.name}</div>
                    <div className="truncate text-[10px] text-[#6b6b6b]">{tool.description}</div>
                  </div>
                </div>

                {/* Category */}
                <span className="inline-flex h-[22px] items-center rounded-[4px] bg-[#f0f0ec] px-2 text-[10px] text-[#6b6b6b] w-fit">
                  {CATEGORY_LABELS[tool.category]}
                </span>

                {/* Adapter */}
                <span className="inline-flex items-center gap-1 text-[10px] text-[#6b6b6b]">
                  {createElement(ADAPTER_ICON_MAP[tool.adapter], { size: 10 })}
                  {ADAPTER_LABELS[tool.adapter]}
                </span>

                {/* Status */}
                <span
                  className={cn(
                    'inline-flex h-[22px] items-center rounded-[6px] px-2 text-[10px] font-medium w-fit',
                    tool.status === 'published' && 'bg-[#e8f5e9] text-[#4caf50]',
                    tool.status === 'draft' && 'bg-[#fff3e0] text-[#ff9800]',
                    tool.status === 'deprecated' && 'bg-[#ffebee] text-[#e74c3c]'
                  )}
                >
                  {STATUS_LABELS[tool.status]}
                </span>

                {/* Trust Level */}
                <span className="text-[10px] text-[#6b6b6b] capitalize">
                  {tool.status === 'published' ? 'verified' : 'untested'}
                </span>

                {/* Success Rate */}
                <span className={cn('text-[11px] font-mono', (tool.successRate ?? 0) >= 90 ? 'text-[#4caf50]' : 'text-[#1a1a1a]')}>
                  {tool.successRate ?? 0}%
                </span>

                {/* Runs */}
                <span className="text-[11px] font-mono text-[#1a1a1a]">{tool.usageCount}</span>

                {/* Version */}
                <span className="text-[11px] font-mono text-[#6b6b6b]">{tool.currentVersion}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
