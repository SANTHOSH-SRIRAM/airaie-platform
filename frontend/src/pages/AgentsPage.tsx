import {
  Bot,
  ExternalLink,
  Plus,
  RotateCcw,
  Layers,
  FileInput,
  MessageSquare,
  MoreHorizontal,
  BookOpen,
  Link2,
  Zap,
} from 'lucide-react';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';
import Badge from '@components/ui/Badge';
import ProgressBar from '@components/ui/ProgressBar';

/* ── Sample data ───────────────────────────────────────────── */

interface AgentItem {
  name: string;
  status: 'success' | 'warning' | 'danger';
  type: string;
  detail: string;
  time: string;
}

const recentAgents: AgentItem[] = [
  { name: 'Support_Bot_V2', status: 'success', type: 'Conversational', detail: 'Active — 12 sessions', time: '10m ago' },
  { name: 'Data_Analyst_Agent', status: 'success', type: 'Task', detail: 'Active — idle', time: '1h ago' },
  { name: 'Code_Review_Agent', status: 'warning', type: 'Autonomous', detail: 'Pending deployment', time: '3h ago' },
  { name: 'Email_Classifier', status: 'danger', type: 'Task', detail: 'Error: API timeout', time: '1d ago' },
];

const statusColor: Record<string, string> = {
  success: 'bg-status-success',
  warning: 'bg-slate-400',
  danger: 'bg-status-warning',
};

const quickActions = [
  { icon: Layers, title: 'Browse Templates', description: 'Pre-built' },
  { icon: FileInput, title: 'Import Spec', description: 'Ext. Config' },
  { icon: MessageSquare, title: 'View Sessions', description: 'Activity Log' },
];

const stats = {
  active: 8,
  inactive: 3,
  error: 1,
  total: 12,
};

const quickLinks = [
  { label: 'Open Agent Studio', icon: ExternalLink, onClick: () => window.open('http://localhost:3002', '_blank') },
  { label: 'Documentation', icon: BookOpen, onClick: () => {} },
  { label: 'API Reference', icon: Link2, onClick: () => {} },
  { label: 'Agent Marketplace', icon: Zap, onClick: () => {} },
];

/* ── Page ──────────────────────────────────────────────────── */

export default function AgentsPage() {
  const openStudio = () => window.open('http://localhost:3002', '_blank');

  return (
    <div className="p-6 space-y-6">
      {/* ── Title Row ─────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-light text-content-primary leading-tight">
            Agents <span className="text-brand-secondary">| Management</span>
          </h1>
          <p className="text-sm text-content-secondary mt-1.5">
            Build, deploy, and monitor intelligent agents across your platform.
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
            Open Agent Studio
          </Button>
        </div>
      </div>

      {/* ── Start Card + Quick Actions ────────────────────── */}
      <Card>
        <div className="flex">
          {/* Left: Start Agent */}
          <div className="flex-1 p-6 border-r border-surface-border">
            <div className="flex items-center gap-2.5 mb-3">
              <Bot size={20} className="text-content-primary" />
              <h2 className="text-sm font-bold text-content-primary uppercase tracking-wide">
                Start Agent
              </h2>
            </div>
            <p className="text-sm text-content-secondary leading-relaxed mb-6">
              Create new intelligent agents, configure capabilities, and define interaction patterns.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={openStudio}>
                NEW AGENT
              </Button>
              <Button variant="secondary" size="md" icon={<RotateCcw size={14} />}>
                OPEN RECENT
              </Button>
              <span className="text-xs text-content-muted font-mono ml-1">#AG_STUDIO_V1</span>
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
        {/* Recent Agents */}
        <Card className="flex-1">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-xs font-bold text-content-primary uppercase tracking-wider">
              Recent Agents
            </h2>
            <button className="p-1 text-content-muted hover:text-content-secondary transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className="px-5 pb-5">
            <div className="space-y-0">
              {recentAgents.map((agent, i) => (
                <div
                  key={agent.name}
                  className={`flex items-start gap-3 py-3.5 px-2 -mx-2 cursor-pointer hover:bg-surface-hover transition-colors ${
                    i < recentAgents.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <span className={`w-[7px] h-[7px] rounded-sm mt-1.5 shrink-0 ${statusColor[agent.status]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-content-primary font-mono truncate">{agent.name}</p>
                      <Badge variant="info" className="text-[9px] px-1.5 py-0">{agent.type}</Badge>
                    </div>
                    <p className="text-xs text-content-tertiary mt-0.5">{agent.detail}</p>
                  </div>
                  <span className="text-xs text-content-muted font-mono shrink-0">{agent.time}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Agent Stats */}
        <Card className="flex-1">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-xs font-bold text-content-primary uppercase tracking-wider">
              Agent Stats
            </h2>
            <Badge variant="success" badgeStyle="outline">HEALTHY</Badge>
          </div>
          <div className="px-5 pb-5 space-y-5">
            <ProgressBar label="Active Rate" value={Math.round((stats.active / stats.total) * 100)} striped />
            <ProgressBar label="Error Rate" value={Math.round((stats.error / stats.total) * 100)} striped />
            <div className="grid grid-cols-2 gap-4 pt-3">
              <div>
                <p className="text-[10px] text-content-tertiary uppercase tracking-widest font-medium">Active</p>
                <p className="text-sm font-semibold text-content-primary font-mono mt-1">{stats.active}</p>
              </div>
              <div>
                <p className="text-[10px] text-content-tertiary uppercase tracking-widest font-medium">Inactive</p>
                <p className="text-sm font-semibold text-content-primary font-mono mt-1">{stats.inactive}</p>
              </div>
              <div>
                <p className="text-[10px] text-content-tertiary uppercase tracking-widest font-medium">Error</p>
                <p className="text-sm font-semibold text-content-primary font-mono mt-1">{stats.error}</p>
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
