import {
  GitBranch,
  ExternalLink,
  Plus,
  RotateCcw,
  FileInput,
  LayoutGrid,
  Play,
  MoreHorizontal,
  BookOpen,
  Link2,
  Layers,
} from 'lucide-react';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';
import Badge from '@components/ui/Badge';
import ProgressBar from '@components/ui/ProgressBar';

/* ── Sample data ───────────────────────────────────────────── */

interface WorkflowItem {
  name: string;
  status: 'success' | 'warning' | 'danger';
  detail: string;
  time: string;
}

const recentWorkflows: WorkflowItem[] = [
  { name: 'Data_Pipeline_ETL', status: 'success', detail: 'Completed successfully', time: '25m ago' },
  { name: 'Model_Training_V3', status: 'warning', detail: 'Awaiting approval', time: '2h ago' },
  { name: 'Deploy_Staging_CI', status: 'success', detail: 'All checks passed', time: '4h ago' },
  { name: 'Batch_Export_CSV', status: 'danger', detail: 'Timeout on step 4', time: '1d ago' },
];

const statusColor: Record<string, string> = {
  success: 'bg-status-success',
  warning: 'bg-slate-400',
  danger: 'bg-status-warning',
};

const quickActions = [
  { icon: FileInput, title: 'Import YAML', description: 'Ext. Config' },
  { icon: LayoutGrid, title: 'Templates', description: 'Pre-built' },
  { icon: Play, title: 'View All Runs', description: 'Execution Log' },
];

const stats = {
  running: 3,
  completed: 47,
  failed: 2,
  total: 52,
};

const quickLinks = [
  { label: 'Open Workflow Studio', icon: ExternalLink, onClick: () => window.open('http://localhost:3001', '_blank') },
  { label: 'Documentation', icon: BookOpen, onClick: () => {} },
  { label: 'API Reference', icon: Link2, onClick: () => {} },
  { label: 'Template Gallery', icon: Layers, onClick: () => {} },
];

/* ── Page ──────────────────────────────────────────────────── */

export default function WorkflowsPage() {
  const openStudio = () => window.open('http://localhost:3001', '_blank');

  return (
    <div className="p-6 space-y-6">
      {/* ── Title Row ─────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-light text-content-primary leading-tight">
            Workflows <span className="text-brand-secondary">| Management</span>
          </h1>
          <p className="text-sm text-content-secondary mt-1.5">
            Create, monitor, and manage automation workflows across your platform.
          </p>
        </div>
        <div className="flex items-start gap-5 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-content-tertiary uppercase tracking-widest font-medium mb-1.5">
              Studio Status
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-surface-border rounded-md">
              <span className="w-2 h-2 bg-status-success rounded-sm" />
              <span className="text-xs font-medium text-content-primary tracking-wide">ONLINE</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="md"
            iconRight={<ExternalLink size={14} />}
            onClick={openStudio}
          >
            Open Workflow Studio
          </Button>
        </div>
      </div>

      {/* ── Start Card + Quick Actions ────────────────────── */}
      <Card>
        <div className="flex">
          {/* Left: Start Workflow */}
          <div className="flex-1 p-6 border-r border-surface-border">
            <div className="flex items-center gap-2.5 mb-3">
              <GitBranch size={20} className="text-content-primary" />
              <h2 className="text-sm font-bold text-content-primary uppercase tracking-wide">
                Start Workflow
              </h2>
            </div>
            <p className="text-sm text-content-secondary leading-relaxed mb-6">
              Design new automation pipelines, configure triggers, and define execution steps.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={openStudio}>
                NEW WORKFLOW
              </Button>
              <Button variant="secondary" size="md" icon={<RotateCcw size={14} />}>
                OPEN RECENT
              </Button>
              <span className="text-xs text-content-muted font-mono ml-1">#WF_STUDIO_V1</span>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="w-[380px] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-surface-border" />
              <span className="text-[10px] font-semibold text-content-tertiary uppercase tracking-widest">
                Quick Actions
              </span>
              <div className="flex-1 h-px bg-surface-border" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  className="flex flex-col items-center gap-2.5 p-4 border border-surface-border hover:border-brand-secondary hover:bg-blue-50 transition-all group"
                >
                  <action.icon
                    size={24}
                    className="text-content-tertiary group-hover:text-brand-secondary transition-colors"
                  />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-content-primary leading-tight">{action.title}</p>
                    <p className="text-[11px] text-content-muted mt-0.5 font-mono">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Bottom 3-Column Grid ──────────────────────────── */}
      <div className="grid grid-cols-3 gap-5">
        {/* Recent Workflows */}
        <Card className="flex-1">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-xs font-bold text-content-primary uppercase tracking-wider">
              Recent Workflows
            </h2>
            <button className="p-1 text-content-muted hover:text-content-secondary transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className="px-5 pb-5">
            <div className="space-y-0">
              {recentWorkflows.map((wf, i) => (
                <div
                  key={wf.name}
                  className={`flex items-start gap-3 py-3.5 px-2 -mx-2 cursor-pointer hover:bg-surface-hover transition-colors ${
                    i < recentWorkflows.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <span className={`w-[7px] h-[7px] rounded-sm mt-1.5 shrink-0 ${statusColor[wf.status]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-content-primary font-mono truncate">{wf.name}</p>
                    <p className="text-xs text-content-tertiary mt-0.5">{wf.detail}</p>
                  </div>
                  <span className="text-xs text-content-muted font-mono shrink-0">{wf.time}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Workflow Stats */}
        <Card className="flex-1">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-xs font-bold text-content-primary uppercase tracking-wider">
              Workflow Stats
            </h2>
            <Badge variant="success" badgeStyle="outline">HEALTHY</Badge>
          </div>
          <div className="px-5 pb-5 space-y-5">
            <ProgressBar label="Success Rate" value={Math.round((stats.completed / stats.total) * 100)} striped />
            <ProgressBar label="Active Capacity" value={Math.round((stats.running / 10) * 100)} striped />
            <div className="grid grid-cols-2 gap-4 pt-3">
              <div>
                <p className="text-[10px] text-content-tertiary uppercase tracking-widest font-medium">Running</p>
                <p className="text-sm font-semibold text-content-primary font-mono mt-1">{stats.running}</p>
              </div>
              <div>
                <p className="text-[10px] text-content-tertiary uppercase tracking-widest font-medium">Completed</p>
                <p className="text-sm font-semibold text-content-primary font-mono mt-1">{stats.completed}</p>
              </div>
              <div>
                <p className="text-[10px] text-content-tertiary uppercase tracking-widest font-medium">Failed</p>
                <p className="text-sm font-semibold text-content-primary font-mono mt-1">{stats.failed}</p>
              </div>
              <div>
                <p className="text-[10px] text-content-tertiary uppercase tracking-widest font-medium">Total</p>
                <p className="text-sm font-semibold text-content-primary font-mono mt-1">{stats.total}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Links */}
        <Card className="flex-1">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-xs font-bold text-content-primary uppercase tracking-wider">
              Quick Links
            </h2>
          </div>
          <div className="px-5 pb-5 space-y-1">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                onClick={link.onClick}
                className="flex items-center gap-3 w-full px-3 py-3 hover:bg-blue-50 transition-colors group"
              >
                <link.icon size={16} className="text-content-tertiary group-hover:text-brand-secondary transition-colors shrink-0" />
                <span className="text-sm text-content-primary group-hover:text-brand-secondary transition-colors">
                  {link.label}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
