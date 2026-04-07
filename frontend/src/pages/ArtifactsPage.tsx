import { useState } from 'react';
import {
  Package, Search, ChevronDown, Grid2X2, List, Download,
  Plus, Star, Link2, Clock, Filter, MoreHorizontal, ExternalLink,
  GitBranch, Box, ChevronRight,
} from 'lucide-react';
import { cn } from '@utils/cn';

/* ─────────────────────────── MOCK DATA ─────────────────────────── */

type ArtifactType = 'PYC' | 'PNG' | 'JSON' | 'LOCK' | 'REC' | 'CSV' | 'PDF' | 'TX' | 'YAML' | 'SIG';
type ArtifactStatus = 'ready' | 'in-progress' | 'pending' | 'archived';

interface Artifact {
  id: string;
  name: string;
  description: string;
  type: ArtifactType;
  size: string;
  sizeBytes: number;
  linkedTo: string;
  status: ArtifactStatus;
  age: string;
  version: string;
  fidelity: number;
}

const ARTIFACTS: Artifact[] = [
  { id: '1', name: 'PIPELINE_BEA.pyc', description: 'CLI execution output, machine-compiled pipeline script', type: 'PYC', size: '1.2 MB', sizeBytes: 1258291, linkedTo: 'fea_pipeline', status: 'in-progress', age: '3 days', version: '0.4.1', fidelity: 4 },
  { id: '2', name: 'Multi_stage_weight.cfg', description: 'Model weight configuration from last training pass', type: 'JSON', size: '0.8 MB', sizeBytes: 838860, linkedTo: 'weight_agent', status: 'in-progress', age: '3 days', version: '0.2.0', fidelity: 3 },
  { id: '3', name: 'Personal_records_pod.rec', description: 'Engineering record pack — governance checkpoint', type: 'REC', size: '512 KB', sizeBytes: 524288, linkedTo: 'records_board', status: 'pending', age: '3 days', version: '1.0.0', fidelity: 5 },
  { id: '4', name: 'Add_base_functional_store.lock', description: 'Dependency lockfile snapshot for reproducibility', type: 'LOCK', size: '94 KB', sizeBytes: 96256, linkedTo: 'store_module', status: 'ready', age: '3 days', version: '0.1.0', fidelity: 5 },
  { id: '5', name: 'CTRL_1_SIG_1.sig', description: 'Cryptographic signature for controlled artifact bundle', type: 'SIG', size: '4 KB', sizeBytes: 4096, linkedTo: 'signal_agent', status: 'in-progress', age: '3 days', version: '0.9.3', fidelity: 4 },
  { id: '6', name: 'output_validation.json', description: 'Validator result set from last workflow execution run', type: 'JSON', size: '390 KB', sizeBytes: 399360, linkedTo: 'validator_tool', status: 'ready', age: '3 days', version: '2.1.1', fidelity: 4 },
  { id: '7', name: 'stream_img_v3_.png', description: 'Stream output image from CFD visualizer at timestep 3', type: 'PNG', size: '2.1 MB', sizeBytes: 2202009, linkedTo: 'sales_board', status: 'ready', age: '3 days', version: '3.0.0', fidelity: 5 },
  { id: '8', name: 'equality_comparison.csv', description: 'Side-by-side comparison table for model equality test', type: 'CSV', size: '620 KB', sizeBytes: 634880, linkedTo: 'comparison_tool', status: 'in-progress', age: '3 days', version: '1.4.0', fidelity: 3 },
  { id: '9', name: 'Summary_phase.json', description: 'Phase summary exported at gate checkpoint boundary', type: 'JSON', size: '188 KB', sizeBytes: 192512, linkedTo: 'phase_runner', status: 'pending', age: '3 days', version: '0.7.2', fidelity: 4 },
  { id: '10', name: 'FILTERED_MASK_TX.tx', description: 'Masked transformation output from structural filter agent', type: 'TX', size: '940 KB', sizeBytes: 962560, linkedTo: 'mask_processor', status: 'in-progress', age: '3 days', version: '1.1.0', fidelity: 4 },
];

const TYPE_COLORS: Record<ArtifactType, { bg: string; text: string }> = {
  PYC:  { bg: 'bg-[#e3f2fd]', text: 'text-[#1565c0]' },
  PNG:  { bg: 'bg-[#e8f5e9]', text: 'text-[#2e7d32]' },
  JSON: { bg: 'bg-[#fff3e0]', text: 'text-[#e65100]' },
  LOCK: { bg: 'bg-[#f3e5f5]', text: 'text-[#6a1b9a]' },
  REC:  { bg: 'bg-[#fce4ec]', text: 'text-[#880e4f]' },
  CSV:  { bg: 'bg-[#e0f7fa]', text: 'text-[#006064]' },
  PDF:  { bg: 'bg-[#ffebee]', text: 'text-[#c62828]' },
  TX:   { bg: 'bg-[#f3e5f5]', text: 'text-[#4a148c]' },
  YAML: { bg: 'bg-[#fffde7]', text: 'text-[#f57f17]' },
  SIG:  { bg: 'bg-[#e8f5e9]', text: 'text-[#1b5e20]' },
};

const STATUS_STYLES: Record<ArtifactStatus, { bg: string; text: string; dot: string; label: string }> = {
  ready:       { bg: 'bg-[#e8f5e9]', text: 'text-[#2e7d32]', dot: 'bg-[#4caf50]', label: 'Ready' },
  'in-progress': { bg: 'bg-[#fff3e0]', text: 'text-[#e65100]', dot: 'bg-[#ff9800]', label: 'In Progress' },
  pending:     { bg: 'bg-[#e3f2fd]', text: 'text-[#1565c0]', dot: 'bg-[#2196f3]', label: 'Pending' },
  archived:    { bg: 'bg-[#f5f5f0]',  text: 'text-[#6b6b6b]', dot: 'bg-[#acacac]', label: 'Archived' },
};

const TYPE_FILTERS = ['All', 'Live: 4', 'New: 6', 'Helpers: 3', 'Python: 4', 'Ready: 2', '+ 4 more'];

const LINEAGE_NODES = [
  { id: 'A', label: 'LinearAction', sub: 'ContainerA/Primary.m4', color: 'bg-[#e3f2fd] border-[#90caf9]', textColor: 'text-[#1565c0]' },
  { id: 'B', label: 'ContainerB', sub: 'Processing stage', color: 'bg-[#fff3e0] border-[#ffcc80]', textColor: 'text-[#e65100]' },
  { id: 'C', label: 'Training model', sub: 'model.checkpoint.v2', color: 'bg-[#fff8e1] border-[#ffe082]', textColor: 'text-[#f57f17]' },
  { id: 'D', label: 'Model agreement', sub: 'AgreementPolicy.v1', color: 'bg-[#e8f5e9] border-[#a5d6a7]', textColor: 'text-[#2e7d32]' },
];

/* ─────────────────────────── SUB-COMPONENTS ─────────────────────── */

function TypeBadge({ type }: { type: ArtifactType }) {
  const c = TYPE_COLORS[type];
  return (
    <span className={cn('inline-flex h-[20px] items-center rounded-[4px] px-1.5 text-[10px] font-semibold tracking-wide', c.bg, c.text)}>
      {type}
    </span>
  );
}

function StatusPill({ status }: { status: ArtifactStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn('inline-flex items-center gap-1 h-[20px] rounded-[6px] px-2 text-[10px] font-medium', s.bg, s.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

function FidelityStars({ score }: { score: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={10}
          className={i <= score ? 'text-[#ff9800] fill-[#ff9800]' : 'text-[#d5d5cf]'}
        />
      ))}
    </span>
  );
}

// Removed inline SecondaryNav in favor of global ArtifactsSidebar

function StatCard({ label, value, sub, children }: { label: string; value: React.ReactNode; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 bg-white rounded-[10px] border border-[#ece9e3] shadow-card px-4 py-3 flex-1">
      <p className="text-[10px] text-[#acacac] uppercase tracking-[0.08em] font-medium">{label}</p>
      <div className="text-[20px] font-bold text-[#1a1a1a] leading-tight">{value}</div>
      {children}
      {sub && <p className="text-[10px] text-[#6b6b6b] mt-0.5">{sub}</p>}
    </div>
  );
}

function ArtifactRow({
  artifact,
  selected,
  onSelect,
}: {
  artifact: Artifact;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(artifact.id)}
      className={cn(
        'relative w-full grid items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-[#f8f8f7]',
        'grid-cols-[20px_minmax(200px,1.8fr)_60px_80px_120px_90px_54px_56px]',
        selected ? 'bg-[#f5f5f0]' : 'hover:bg-[#fbfaf9]'
      )}
    >
      {selected && <span className="absolute inset-y-0 left-0 w-[3px] bg-[#2196f3] rounded-r" />}

      {/* Checkbox */}
      <span className="flex items-center justify-center">
        <span className={cn(
          'w-3.5 h-3.5 rounded border flex items-center justify-center',
          selected ? 'bg-[#1a1a1a] border-[#1a1a1a]' : 'border-[#d5d5cf] bg-white'
        )}>
          {selected && (
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </span>

      {/* Name & desc */}
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-[#1a1a1a]">{artifact.name}</p>
        <p className="truncate text-[10px] text-[#6b6b6b] mt-0.5">{artifact.description}</p>
      </div>

      {/* Type */}
      <TypeBadge type={artifact.type} />

      {/* Size */}
      <span className="text-[11px] text-[#1a1a1a] font-mono">{artifact.size}</span>

      {/* Linked to */}
      <span className="flex items-center gap-1 text-[11px] text-[#6b6b6b] truncate">
        <Link2 size={10} className="shrink-0 text-[#acacac]" />
        <span className="truncate">{artifact.linkedTo}</span>
      </span>

      {/* Status */}
      <StatusPill status={artifact.status} />

      {/* Age */}
      <span className="flex items-center gap-1 text-[10px] text-[#acacac]">
        <Clock size={9} />
        {artifact.age}
      </span>

      {/* Actions */}
      <span className="flex items-center gap-1">
        <button type="button" onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-[#f0f0ec] text-[#acacac] hover:text-[#6b6b6b] transition-colors">
          <ExternalLink size={11} />
        </button>
        <button type="button" onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-[#f0f0ec] text-[#acacac] hover:text-[#6b6b6b] transition-colors">
          <MoreHorizontal size={11} />
        </button>
      </span>
    </button>
  );
}

function ArtifactDetailPanel({ artifact }: { artifact: Artifact | null }) {
  if (!artifact) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-[#acacac]">
        Select an artifact to view details
      </div>
    );
  }

  const VERSIONS = ['v3.0.0 · Current', 'v2.1.1 · 5 days ago', 'v2.0.0 · Archived'];

  return (
    <div className="flex gap-0 h-full">
      {/* Left: detail */}
      <div className="flex-1 px-5 py-4 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package size={13} className="text-[#6b6b6b]" />
            <span className="text-[12px] font-semibold text-[#1a1a1a]">Artifact Detail</span>
          </div>
          <button type="button" className="text-[11px] text-[#2196f3] hover:underline flex items-center gap-1">
            Open full <ExternalLink size={10} />
          </button>
        </div>

        <div className="flex gap-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-[10px] bg-[#e3f2fd] border border-[#90caf9] flex items-center justify-center shrink-0">
            <Box size={24} className="text-[#1565c0]" />
          </div>

          {/* Fields */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#1a1a1a] truncate">{artifact.name}</p>
            <p className="text-[10px] text-[#6b6b6b] mt-0.5 line-clamp-2">{artifact.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <TypeBadge type={artifact.type} />
              <StatusPill status={artifact.status} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
          {[
            { label: 'Size', value: artifact.size },
            { label: 'Version', value: artifact.version },
            { label: 'Linked To', value: artifact.linkedTo },
            { label: 'Age', value: artifact.age },
            { label: 'Fidelity', value: <FidelityStars score={artifact.fidelity} /> },
            { label: 'Format', value: artifact.type },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[10px] text-[#acacac]">{label}</span>
              <span className="text-[11px] text-[#1a1a1a] font-medium">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-[#f0f0ec]">
          <p className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.08em] mb-2">Actions</p>
          <div className="flex gap-2 flex-wrap">
            {['Download', 'Add to Board', 'View Lineage'].map((action) => (
              <button
                key={action}
                type="button"
                className="px-2.5 py-1 text-[11px] border border-[#ece9e3] rounded-[6px] text-[#2d2d2d] hover:bg-[#f8f8f7] transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: versions + events */}
      <div className="w-[180px] shrink-0 border-l border-[#f0f0ec] px-3 py-4">
        <p className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.08em] mb-2">Versions</p>
        <div className="flex flex-col gap-1 mb-4">
          {VERSIONS.map((v, i) => (
            <div key={v} className={cn(
              'px-2 py-1.5 rounded-[6px] text-[10px] cursor-pointer transition-colors',
              i === 0 ? 'bg-[#1a1a1a] text-white' : 'text-[#6b6b6b] hover:bg-[#f0f0ec]'
            )}>
              {v}
            </div>
          ))}
        </div>

        <p className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.08em] mb-2">Related Channels</p>
        <div className="flex flex-col gap-1">
          {['Discussed Artifact Duty', 'Test Fast Lineage', 'Find tailboard', 'Erase SkrNow'].map((ch) => (
            <button key={ch} type="button" className="text-left px-2 py-1 text-[10px] text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f0f0ec] rounded-[4px] transition-colors truncate">
              {ch}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LineageGraph() {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch size={13} className="text-[#6b6b6b]" />
          <span className="text-[12px] font-semibold text-[#1a1a1a]">Artifact Lineage</span>
          <span className="text-[10px] text-[#acacac] bg-[#f0f0ec] px-2 py-0.5 rounded-full">ContainerA/Primary.m4</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="text-[10px] text-[#6b6b6b] hover:text-[#1a1a1a] flex items-center gap-1">
            <Filter size={10} /> Filter lineage
          </button>
          <button type="button" className="text-[10px] text-[#2196f3] hover:underline flex items-center gap-1">
            Expand <ExternalLink size={10} />
          </button>
        </div>
      </div>

      {/* Lineage rows */}
      {[0, 1].map((row) => (
        <div key={row} className={cn('flex items-center gap-0 mb-3', row === 1 && 'opacity-50')}>
          {LINEAGE_NODES.map((node, i) => (
            <div key={node.id} className="flex items-center">
              <div className={cn(
                'flex flex-col justify-center px-3 py-2 rounded-[8px] border text-left min-w-[130px]',
                node.color
              )}>
                <p className={cn('text-[11px] font-semibold', node.textColor)}>{node.label}</p>
                <p className="text-[9px] text-[#6b6b6b] truncate mt-0.5">{node.sub}</p>
              </div>
              {i < LINEAGE_NODES.length - 1 && (
                <div className="flex items-center mx-1">
                  <div className="w-8 h-px bg-[#d5d5cf]" />
                  <ChevronRight size={12} className="text-[#acacac] -ml-2" />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#f0f0ec] text-[10px] text-[#acacac]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2196f3]" /> Primary lineage · 4 nodes</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ff9800]" /> Branch lineage · 2 nodes</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4caf50]" /> Terminal node</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── MAIN PAGE ─────────────────────────── */

export default function ArtifactsPage() {
  const [search, setSearch] = useState('');
  const [timeFilter] = useState('All Time');
  const [versionFilter] = useState('All Versions');
  const [sortFilter] = useState('Most Recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeTypeTab, setActiveTypeTab] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>('7');

  const filtered = ARTIFACTS.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase())
  );

  const selectedArtifact = ARTIFACTS.find((a) => a.id === selectedId) ?? null;

  const totalSize = '1.42 MB';
  const avgFidelity = 4;
  const accuracy = '100%';
  const linkedBoards = 12;

  return (
    <div className="mx-auto w-full max-w-[1116px] px-4 pt-4 pb-8">
      <div className="flex items-start gap-4 relative">
        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 pb-4">
          {/* ── Header bar ── */}
          <section className="flex items-center justify-between gap-3 bg-white rounded-[12px] border border-[#ece9e3] shadow-card px-5 py-3">
            <div className="flex items-center gap-3">
              <Package size={17} className="text-[#2196f3]" />
              <h1 className="text-[18px] font-bold text-[#1a1a1a]">Artifacts</h1>
              <span className="inline-flex items-center h-[20px] rounded-full bg-[#ff9800] px-2.5 text-[9px] font-bold text-white tracking-wider uppercase">
                Staging
              </span>
              <span className="text-[10px] text-[#acacac]">07 March 2026</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <label className="relative flex h-8 items-center rounded-[8px] bg-[#f5f5f0] px-2.5 shadow-[inset_0_0_0_1px_rgba(236,233,227,0.95)] min-w-[160px]">
                <Search size={12} className="shrink-0 text-[#acacac]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find Artifact..."
                  className="w-full bg-transparent pl-1.5 text-[11px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none"
                />
              </label>

              {/* Dropdowns */}
              {([
                [timeFilter, ['All Time', 'Last 7 days', 'Last 30 days']],
                [versionFilter, ['All Versions', 'Latest', 'Stable']],
                [sortFilter, ['Most Recent', 'Most Impact', 'Largest', 'Oldest']],
              ] as [string, string[]][]).map(([val], i) => (
                <div key={i} className="relative">
                  <button
                    type="button"
                    className="flex h-8 items-center gap-1.5 rounded-[8px] bg-[#f5f5f0] px-3 text-[11px] text-[#6b6b6b] shadow-[inset_0_0_0_1px_rgba(236,233,227,0.95)] hover:bg-[#f0f0ec] whitespace-nowrap"
                  >
                    {val} <ChevronDown size={11} className="text-[#acacac]" />
                  </button>
                </div>
              ))}

              {/* View toggle */}
              <div className="flex items-center rounded-[8px] bg-[#f5f5f0] shadow-[inset_0_0_0_1px_rgba(236,233,227,0.95)]">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn('flex h-8 w-8 items-center justify-center rounded-l-[8px] transition-colors', viewMode === 'grid' ? 'bg-white shadow text-[#1a1a1a]' : 'text-[#acacac] hover:text-[#6b6b6b]')}
                >
                  <Grid2X2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn('flex h-8 w-8 items-center justify-center rounded-r-[8px] transition-colors', viewMode === 'list' ? 'bg-white shadow text-[#1a1a1a]' : 'text-[#acacac] hover:text-[#6b6b6b]')}
                >
                  <List size={13} />
                </button>
              </div>
            </div>
          </section>

          {/* ── Stats row ── */}
          <div className="flex gap-3">
            <StatCard label="Total Artifacts" value={47} sub="This is progress">
              <p className="text-[10px] text-[#4caf50]">+3 this week</p>
            </StatCard>
            <StatCard label="Total Size" value={totalSize} sub="Across all files">
              <p className="text-[10px] text-[#6b6b6b]">Avg 30 KB</p>
            </StatCard>
            <StatCard label="Fidelity" value={<FidelityStars score={avgFidelity} />} sub="4 stars avg">
              <p className="text-[10px] text-[#ff9800]">+1 from last run</p>
            </StatCard>
            <StatCard label="Accuracy" value={accuracy} sub="0% AUC drop">
              <div className="flex items-center gap-1">
                <div className="h-1.5 flex-1 rounded-full bg-[#e8f5e9]">
                  <div className="h-full w-full rounded-full bg-[#4caf50]" />
                </div>
              </div>
            </StatCard>
            <StatCard label="Linked Boards" value={linkedBoards} sub="Workflows to analyze">
              <p className="text-[10px] text-[#2196f3]">View all boards →</p>
            </StatCard>
          </div>

          {/* ── Artifacts List ── */}
          <section className="bg-white rounded-[12px] border border-[#ece9e3] shadow-card overflow-hidden">
            {/* Type filter tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-[#f0f0ec] overflow-x-auto">
              {TYPE_FILTERS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTypeTab(tab)}
                  className={cn(
                    'px-3 py-1.5 text-[11px] rounded-t-[6px] whitespace-nowrap border-b-2 transition-colors -mb-px',
                    activeTypeTab === tab
                      ? 'border-[#1a1a1a] text-[#1a1a1a] font-semibold bg-[#f8f8f7]'
                      : 'border-transparent text-[#6b6b6b] hover:text-[#1a1a1a]'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Table header */}
            <div className="grid items-center gap-3 px-4 py-2 border-b border-[#f0f0ec] text-[9px] font-semibold uppercase tracking-[0.08em] text-[#acacac] grid-cols-[20px_minmax(200px,1.8fr)_60px_80px_120px_90px_54px_56px]">
              <span />
              <span>Artifact Name</span>
              <span>Type</span>
              <span>Size</span>
              <span>Linked To</span>
              <span>Status</span>
              <span>Age</span>
              <span>Actions</span>
            </div>

            {/* Rows */}
            <div>
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-[12px] text-[#acacac]">No artifacts match your search.</div>
              ) : (
                filtered.map((a) => (
                  <ArtifactRow key={a.id} artifact={a} selected={selectedId === a.id} onSelect={setSelectedId} />
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#f0f0ec]">
              <span className="text-[10px] text-[#acacac]">Showing {filtered.length} / 47</span>
              <div className="flex items-center gap-3 text-[10px] text-[#6b6b6b]">
                <button type="button" className="hover:text-[#1a1a1a] transition-colors">← Previous Page</button>
                <span className="text-[#acacac]">1 / 5</span>
                <button type="button" className="hover:text-[#1a1a1a] transition-colors">Next Page →</button>
              </div>
            </div>
          </section>

          {/* ── Artifact Detail ── */}
          <section className="bg-white rounded-[12px] border border-[#ece9e3] shadow-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#f0f0ec]">
              <Package size={12} className="text-[#6b6b6b]" />
              <span className="text-[11px] font-semibold text-[#1a1a1a]">Artifact Detail</span>
              {selectedArtifact && (
                <span className="text-[10px] text-[#acacac] bg-[#f0f0ec] rounded-full px-2 py-0.5">{selectedArtifact.name}</span>
              )}
            </div>
            <div className="h-[220px]">
              <ArtifactDetailPanel artifact={selectedArtifact} />
            </div>
          </section>

          {/* ── Artifact Lineage ── */}
          <section className="bg-white rounded-[12px] border border-[#ece9e3] shadow-card overflow-hidden">
            <LineageGraph />
          </section>

          {/* ── Fixed bottom action bar (Floating inside content) ── */}
          <div className="sticky bottom-4 z-10 flex items-center justify-between px-6 py-3 bg-white rounded-[12px] border border-[#ece9e3] shadow-[0px_4px_24px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2">
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] text-white text-[11px] font-medium rounded-[8px] hover:bg-[#2d2d2d] transition-colors">
                <Download size={12} /> Download Selected
              </button>
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 border border-[#ece9e3] text-[#2d2d2d] text-[11px] font-medium rounded-[8px] hover:bg-[#f8f8f7] transition-colors">
                <Plus size={12} /> Add to Board
              </button>
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 border border-[#ece9e3] text-[#2d2d2d] text-[11px] font-medium rounded-[8px] hover:bg-[#f8f8f7] transition-colors">
                <Filter size={12} /> Filter Lineage
              </button>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[#acacac]">
              <span>10, 10/10/10 · AUC 90 · 3 Apps</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4caf50]" />
                On / Off
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
