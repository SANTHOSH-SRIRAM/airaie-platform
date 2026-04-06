import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Clock,
  GitBranch,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Webhook,
  Zap,
} from 'lucide-react';
import Button from '@components/ui/Button';
import CreateWorkflowModal from '@components/workflows/CreateWorkflowModal';
import { cn } from '@utils/cn';

type WorkflowStatus = 'published' | 'draft';
type RunStatus = 'running' | 'succeeded' | 'failed' | 'waiting';
type TriggerType = 'webhook' | 'manual' | 'schedule' | 'event';
type AccentTone = 'blue' | 'orange' | 'red';

interface WorkflowCard {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  version: string;
  nodeCount: number;
  triggerType: TriggerType;
  lastRunTime: string;
  lastRunStatus: RunStatus;
  cost: string;
  accent: AccentTone;
  pinned?: boolean;
}

const WORKFLOWS: WorkflowCard[] = [
  {
    id: 'wf_fea_validation',
    name: 'FEA Validation Pipeline',
    description: 'End-to-end FEA stress validation with mesh generation and evidence gating',
    status: 'published',
    version: 'v3',
    nodeCount: 5,
    triggerType: 'webhook',
    lastRunTime: '2m ago',
    lastRunStatus: 'running',
    cost: '$1.24',
    accent: 'blue',
    pinned: true,
  },
  {
    id: 'wf_cfd_analysis',
    name: 'CFD Analysis Flow',
    description: 'Computational fluid dynamics pipeline for thermal analysis',
    status: 'draft',
    version: 'v1',
    nodeCount: 3,
    triggerType: 'manual',
    lastRunTime: '1h ago',
    lastRunStatus: 'running',
    cost: '$0.80',
    accent: 'blue',
  },
  {
    id: 'wf_material_testing',
    name: 'Material Testing Pipeline',
    description: 'Automated material property testing with approval gates',
    status: 'published',
    version: 'v2',
    nodeCount: 7,
    triggerType: 'schedule',
    lastRunTime: '3h ago',
    lastRunStatus: 'waiting',
    cost: '$2.05',
    accent: 'orange',
  },
  {
    id: 'wf_topology_opt',
    name: 'Topology Optimization',
    description: 'Generative topology optimization for lightweight structural design',
    status: 'draft',
    version: 'v1',
    nodeCount: 4,
    triggerType: 'manual',
    lastRunTime: 'Yesterday',
    lastRunStatus: 'succeeded',
    cost: '$5.20',
    accent: 'orange',
  },
  {
    id: 'wf_mesh_quality',
    name: 'Mesh Quality Check',
    description: 'Quick mesh quality validation and auto-repair pipeline',
    status: 'published',
    version: 'v1',
    nodeCount: 2,
    triggerType: 'webhook',
    lastRunTime: '2 days ago',
    lastRunStatus: 'succeeded',
    cost: '$0.15',
    accent: 'blue',
  },
  {
    id: 'wf_fatigue_life',
    name: 'Fatigue Life Estimation',
    description: 'Fatigue analysis with cycle counting and S-N curve evaluation',
    status: 'published',
    version: 'v2',
    nodeCount: 6,
    triggerType: 'event',
    lastRunTime: '3 days ago',
    lastRunStatus: 'succeeded',
    cost: '$3.40',
    accent: 'blue',
  },
  {
    id: 'wf_thermal_stress',
    name: 'Thermal Stress Coupling',
    description: 'Coupled thermal-structural analysis for high-temperature components',
    status: 'draft',
    version: 'v1',
    nodeCount: 8,
    triggerType: 'manual',
    lastRunTime: '1 week ago',
    lastRunStatus: 'failed',
    cost: '',
    accent: 'red',
  },
  {
    id: 'wf_report_gen',
    name: 'Report Generator',
    description: 'Automated engineering report generation from simulation results',
    status: 'published',
    version: 'v1',
    nodeCount: 3,
    triggerType: 'webhook',
    lastRunTime: '',
    lastRunStatus: 'succeeded',
    cost: '$0.30',
    accent: 'blue',
  },
];

const accentColors: Record<AccentTone, string> = {
  blue: '#2196F3',
  orange: '#FF9800',
  red: '#E74C3C',
};

const runStatusConfig: Record<RunStatus, { dot: string; text: string; label: string }> = {
  running: { dot: 'bg-[#2196f3]', text: 'text-[#2196f3]', label: 'Running' },
  succeeded: { dot: 'bg-[#9c9c9c]', text: 'text-[#6b6b6b]', label: 'Succeeded' },
  failed: { dot: 'bg-[#e74c3c]', text: 'text-[#e74c3c]', label: 'Failed' },
  waiting: { dot: 'bg-[#ff9800]', text: 'text-[#ff9800]', label: 'Waiting' },
};

const triggerIcons: Record<TriggerType, typeof Webhook> = {
  webhook: Webhook,
  manual: GitBranch,
  schedule: Clock,
  event: Zap,
};

type StatusFilter = 'all' | 'published' | 'draft';
type SortOption = 'lastModified' | 'name' | 'cost';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'lastModified', label: 'Last Modified' },
  { value: 'name', label: 'Name' },
  { value: 'cost', label: 'Cost' },
];

function SelectDropdown<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
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

function WorkflowGlyph({ tone }: { tone: AccentTone }) {
  const stroke = accentColors[tone];

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.25" y="2.25" width="4.5" height="4.5" rx="1.1" stroke={stroke} strokeWidth="1.5" />
      <rect x="2.25" y="13.25" width="4.5" height="4.5" rx="1.1" stroke={stroke} strokeWidth="1.5" />
      <rect x="13.25" y="13.25" width="4.5" height="4.5" rx="1.1" stroke={stroke} strokeWidth="1.5" />
      <path
        d="M6.75 4.5H10.5V13.25H13.25"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4.5 6.75V13.25" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StatusPill({ status }: { status: WorkflowStatus }) {
  const isPublished = status === 'published';

  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center rounded-[6px] px-2 text-[10px] font-medium',
        isPublished ? 'bg-[#e8f5e9] text-[#4caf50]' : 'bg-[#fff3e0] text-[#ff9800]'
      )}
    >
      {isPublished ? 'Published' : 'Draft'}
    </span>
  );
}

function MetaChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center rounded-[4px] bg-[#f0f0ec] px-2 text-[10px] text-[#6b6b6b]',
        className
      )}
    >
      {children}
    </span>
  );
}

function FooterStatus({ workflow }: { workflow: WorkflowCard }) {
  const config = runStatusConfig[workflow.lastRunStatus];

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={cn('h-[6px] w-[6px] shrink-0 rounded-[3px]', config.dot)} />
      <span className={cn('truncate text-[11px] font-medium', config.text)}>
        {workflow.lastRunTime ? `${workflow.lastRunTime} · ${config.label}` : config.label}
      </span>
    </div>
  );
}

function OverflowButton() {
  return (
    <button
      type="button"
      className="flex h-4 w-4 items-center justify-center rounded-full text-[#c1c1bc] transition-colors hover:text-[#6b6b6b]"
      aria-label="Open workflow menu"
    >
      <MoreHorizontal size={14} />
    </button>
  );
}

function ActiveMarker() {
  return (
    <span className="inline-flex h-3 w-3 rounded-[6px] border-2 border-[rgba(33,150,243,0.22)] shadow-[0px_0px_0px_4px_rgba(33,150,243,0.08)]" />
  );
}

function WorkflowCardItem({ workflow }: { workflow: WorkflowCard }) {
  const navigate = useNavigate();
  const TriggerIcon = triggerIcons[workflow.triggerType];

  return (
    <article
      onClick={() => navigate(`/workflows/${workflow.id}`)}
      className="flex h-[220px] flex-col rounded-[12px] border border-[#ece9e3] bg-white p-5 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer">
      <div className="flex items-start justify-between pb-[10px]">
        <WorkflowGlyph tone={workflow.accent} />
        <div className="flex items-center gap-[10px]">
          <StatusPill status={workflow.status} />
          {workflow.pinned && <ActiveMarker />}
          <OverflowButton />
        </div>
      </div>

      <div className="min-h-[42px] pb-1">
        <h2 className="text-[15px] font-semibold leading-[18.75px] text-[#1a1a1a]">
          {workflow.name}
        </h2>
      </div>

      <p className="min-h-[34px] text-[12px] leading-[16.8px] text-[#6b6b6b]">
        {workflow.description}
      </p>

      <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 pt-[14px]">
        <MetaChip className="font-mono text-[#1a1a1a]">{workflow.version}</MetaChip>
        <MetaChip>{workflow.nodeCount} nodes</MetaChip>
        <MetaChip className="gap-[5px]">
          <TriggerIcon size={8} className="shrink-0" />
          {workflow.triggerType}
        </MetaChip>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[#f0f0ec] pt-[11px]">
        <FooterStatus workflow={workflow} />
        <span className="font-mono text-[11px] text-[#acacac]">
          {workflow.cost || ''}
        </span>
      </div>
    </article>
  );
}

function WorkflowListItem({ workflow }: { workflow: WorkflowCard }) {
  const navigate = useNavigate();
  const TriggerIcon = triggerIcons[workflow.triggerType];

  return (
    <article
      onClick={() => navigate(`/workflows/${workflow.id}`)}
      className="flex items-center gap-4 rounded-[12px] border border-[#ece9e3] bg-white px-5 py-4 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] cursor-pointer">
      <WorkflowGlyph tone={workflow.accent} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-[15px] font-semibold leading-[18.75px] text-[#1a1a1a]">
            {workflow.name}
          </h2>
          <StatusPill status={workflow.status} />
        </div>
        <p className="mt-1 truncate text-[12px] leading-[16.8px] text-[#6b6b6b]">
          {workflow.description}
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
        <MetaChip className="font-mono text-[#1a1a1a]">{workflow.version}</MetaChip>
        <MetaChip>{workflow.nodeCount} nodes</MetaChip>
        <MetaChip className="gap-[5px]">
          <TriggerIcon size={8} className="shrink-0" />
          {workflow.triggerType}
        </MetaChip>
      </div>

      <div className="hidden min-w-[160px] shrink-0 justify-start lg:flex">
        <FooterStatus workflow={workflow} />
      </div>

      <span className="hidden w-12 shrink-0 text-right font-mono text-[11px] text-[#acacac] lg:block">
        {workflow.cost || '—'}
      </span>

      <OverflowButton />
    </article>
  );
}

function StatusBar({ workflows }: { workflows: WorkflowCard[] }) {
  const publishedCount = workflows.filter((workflow) => workflow.status === 'published').length;
  const draftCount = workflows.filter((workflow) => workflow.status === 'draft').length;
  const activeRuns = workflows.filter(
    (workflow) => workflow.lastRunStatus === 'running' || workflow.lastRunStatus === 'waiting'
  ).length;

  return (
    <div className="flex justify-center pt-1">
      <div className="inline-flex h-9 items-center gap-2 rounded-[12px] bg-white px-3.5 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
        <span className="h-[6px] w-[6px] rounded-[3px] bg-[#4caf50]" />
        <span className="text-[11px] font-medium text-[#4caf50]">System Operational</span>
        <span className="text-[10px] font-medium text-[#d0d0d0]">·</span>
        <span className="text-[10px] font-medium text-[#6b6b6b]">{workflows.length} workflows</span>
        <span className="text-[10px] font-medium text-[#d0d0d0]">·</span>
        <span className="text-[10px] font-medium text-[#6b6b6b]">
          {publishedCount} published · {draftCount} draft
        </span>
        <span className="text-[10px] font-medium text-[#d0d0d0]">·</span>
        <span className="text-[10px] font-medium text-[#2196f3]">{activeRuns} active runs</span>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('lastModified');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = useMemo(() => {
    let result = WORKFLOWS;

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (workflow) =>
          workflow.name.toLowerCase().includes(query) ||
          workflow.description.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((workflow) => workflow.status === statusFilter);
    }

    if (sortBy === 'name') {
      result = [...result].sort((left, right) => left.name.localeCompare(right.name));
    } else if (sortBy === 'cost') {
      result = [...result].sort((left, right) => {
        const leftCost = Number.parseFloat(left.cost.replace('$', '') || '0');
        const rightCost = Number.parseFloat(right.cost.replace('$', '') || '0');
        return rightCost - leftCost;
      });
    }

    return result;
  }, [search, sortBy, statusFilter]);

  return (
    <div className="mx-auto w-full max-w-[1116px] px-4 pb-8">
      <div className="flex flex-col gap-4">
        <section className="flex min-h-[72px] flex-col gap-4 rounded-[12px] bg-white px-6 py-4 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold leading-[22px] text-[#1a1a1a]">Workflows</h1>
            <span className="inline-flex h-[22px] items-center rounded-[8px] bg-[#f0f0ec] px-[10px] text-[11px] font-medium text-[#acacac]">
              {filtered.length} total
            </span>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            <label className="relative flex h-9 w-full max-w-[240px] items-center rounded-[8px] bg-[#f5f5f0] px-3 shadow-[inset_0_0_0_1px_rgba(236,233,227,0.95)]">
              <Search size={14} className="shrink-0 text-[#acacac]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search workflows..."
                className="w-full bg-transparent pl-2 text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none"
              />
            </label>

            <SelectDropdown
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={setStatusFilter}
              className="w-[120px]"
            />
            <SelectDropdown
              value={sortBy}
              options={SORT_OPTIONS}
              onChange={setSortBy}
              className="w-[130px]"
            />

            <div className="flex h-9 items-center gap-[2px] rounded-[8px] bg-[#f5f5f0] p-[3px] shadow-[inset_0_0_0_1px_rgba(236,233,227,0.95)]">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex h-[30px] w-[30px] items-center justify-center rounded-[6px] transition-colors',
                  viewMode === 'grid' ? 'bg-[#2d2d2d] text-white' : 'text-[#949494] hover:bg-white'
                )}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex h-[30px] w-[30px] items-center justify-center rounded-[6px] transition-colors',
                  viewMode === 'list' ? 'bg-[#2d2d2d] text-white' : 'text-[#949494] hover:bg-white'
                )}
              >
                <List size={16} />
              </button>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowCreateModal(true)}
              className="h-9 rounded-[8px] bg-[#2d2d2d] px-[14px] text-[13px] font-medium text-white shadow-none hover:bg-[#242424]"
            >
              New Workflow
            </Button>
          </div>
        </section>

        {filtered.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[12px] border border-[#ece9e3] bg-white text-center shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
            <h2 className="text-[15px] font-semibold text-[#1a1a1a]">No workflows found</h2>
            <p className="mt-2 text-[12px] text-[#6b6b6b]">Try adjusting your search or filters.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((workflow) => (
              <WorkflowCardItem key={workflow.id} workflow={workflow} />
            ))}
          </section>
        ) : (
          <section className="space-y-3">
            {filtered.map((workflow) => (
              <WorkflowListItem key={workflow.id} workflow={workflow} />
            ))}
          </section>
        )}

        <StatusBar workflows={WORKFLOWS} />
      </div>

      <CreateWorkflowModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => {
          setShowCreateModal(false);
          // Navigate to workflow editor after creation
          navigate('/workflow-studio');
        }}
      />
    </div>
  );
}
