import {
  Bot, ExternalLink, Plus, RotateCcw, Layers, FileInput, MessageSquare,
  MoreHorizontal, BookOpen, Link2, Zap, ArrowRight,
} from 'lucide-react';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';
import Badge from '@components/ui/Badge';
import ProgressBar from '@components/ui/ProgressBar';

const recentAgents = [
  { name: 'Support_Bot_V2', status: 'success' as const, type: 'Conversational', detail: 'Active — 12 sessions', time: '10m ago' },
  { name: 'Data_Analyst_Agent', status: 'success' as const, type: 'Task', detail: 'Active — idle', time: '1h ago' },
  { name: 'Code_Review_Agent', status: 'warning' as const, type: 'Autonomous', detail: 'Pending deployment', time: '3h ago' },
  { name: 'Email_Classifier', status: 'danger' as const, type: 'Task', detail: 'Error: API timeout', time: '1d ago' },
];

const statusConfig: Record<string, { dot: string; hoverBg: string }> = {
  success: { dot: 'bg-status-success', hoverBg: 'hover:bg-status-success-bg' },
  warning: { dot: 'bg-status-warning', hoverBg: 'hover:bg-status-warning-bg' },
  danger:  { dot: 'bg-status-danger',  hoverBg: 'hover:bg-status-danger-bg' },
};

const quickActions = [
  { icon: Layers, title: 'Browse Templates', description: 'Pre-built' },
  { icon: FileInput, title: 'Import Spec', description: 'Ext. Config' },
  { icon: MessageSquare, title: 'View Sessions', description: 'Activity Log' },
];

const stats = { active: 8, inactive: 3, error: 1, total: 12 };

const quickLinks = [
  { label: 'Open Agent Studio', icon: ExternalLink, onClick: () => window.open('http://localhost:3002', '_blank') },
  { label: 'Documentation', icon: BookOpen, onClick: () => {} },
  { label: 'API Reference', icon: Link2, onClick: () => {} },
  { label: 'Agent Marketplace', icon: Zap, onClick: () => {} },
];

export default function AgentsPage() {
  const openStudio = () => window.open('http://localhost:3002', '_blank');

  return (
    <div className="p-6 space-y-6 max-w-[1584px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[2rem] font-light text-content-primary leading-tight tracking-tight">Agents</h1>
          <p className="text-sm text-content-helper mt-1.5">Build, deploy, and monitor intelligent agents across your platform.</p>
        </div>
        <div className="flex items-start gap-4 shrink-0">
          <div className="text-right">
            <p className="text-[11px] text-content-placeholder uppercase tracking-wider mb-1.5 font-medium">Studio Status</p>
            <div className="inline-flex items-center gap-2 h-8 px-4 bg-card-bg border border-card-border rounded-md shadow-xs">
              <span className="w-2 h-2 bg-status-success rounded-full" />
              <span className="text-xs font-medium text-content-primary tracking-wide">ONLINE</span>
            </div>
          </div>
          <Button variant="tertiary" size="md" iconRight={<ExternalLink size={14} />} onClick={openStudio}>Open Agent Studio</Button>
        </div>
      </div>

      <Card variant="accent">
        <div className="flex">
          <div className="flex-1 px-5 py-6 border-r border-card-border-inner">
            <div className="flex items-center gap-2 mb-3">
              <Bot size={20} className="text-brand-primary" />
              <h2 className="text-sm font-semibold text-content-primary uppercase tracking-wide">Start Agent</h2>
            </div>
            <p className="text-sm text-content-secondary leading-relaxed mb-6">Create new intelligent agents, configure capabilities, and define interaction patterns.</p>
            <div className="flex items-center gap-3">
              <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={openStudio}>NEW AGENT</Button>
              <Button variant="tertiary" size="md" icon={<RotateCcw size={14} />}>OPEN RECENT</Button>
              <span className="text-xs text-content-placeholder font-mono ml-1">#AG_STUDIO_V1</span>
            </div>
          </div>
          <div className="w-[380px] px-5 py-6">
            <p className="text-[11px] text-content-helper uppercase tracking-wider mb-4 text-center font-medium">Quick Actions</p>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <button key={action.title} className="flex flex-col items-center gap-2.5 p-4 rounded-md border border-card-border bg-card-header hover:bg-card-bg hover:border-brand-primary hover:shadow-elevated transition-all duration-150 group">
                  <action.icon size={22} strokeWidth={1.5} className="text-content-helper group-hover:text-brand-primary transition-colors duration-150" />
                  <div className="text-center">
                    <p className="text-xs font-medium text-content-primary leading-tight">{action.title}</p>
                    <p className="text-[11px] text-content-placeholder mt-0.5 font-mono">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card variant="elevated" className="flex-1">
          <div className="flex items-center justify-between px-5 h-12 border-b border-card-border-inner bg-card-header">
            <h2 className="text-xs font-semibold text-content-primary uppercase tracking-wider">Recent Agents</h2>
            <button className="w-8 h-8 flex items-center justify-center text-content-placeholder hover:text-content-secondary hover:bg-surface-hover rounded-md transition-colors duration-100">
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div>
            {recentAgents.map((agent) => {
              const cfg = statusConfig[agent.status];
              return (
                <div key={agent.name} className={`flex items-start gap-3 px-5 py-3.5 border-b border-border-subtle last:border-b-0 cursor-pointer ${cfg.hoverBg} transition-colors duration-100`}>
                  <span className={`w-2 h-2 mt-[7px] rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-content-primary font-mono truncate">{agent.name}</p>
                      <Badge variant="info" className="text-[10px] px-1.5 h-[18px]">{agent.type}</Badge>
                    </div>
                    <p className="text-xs text-content-helper mt-0.5">{agent.detail}</p>
                  </div>
                  <span className="text-[11px] text-content-placeholder font-mono shrink-0 mt-0.5">{agent.time}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card variant="elevated" className="flex-1">
          <div className="flex items-center justify-between px-5 h-12 border-b border-card-border-inner bg-card-header">
            <h2 className="text-xs font-semibold text-content-primary uppercase tracking-wider">Agent Stats</h2>
            <Badge variant="success" badgeStyle="outline">HEALTHY</Badge>
          </div>
          <div className="px-5 py-5 space-y-5">
            <ProgressBar label="Active Rate" value={Math.round((stats.active / stats.total) * 100)} variant="blue" striped />
            <ProgressBar label="Error Rate" value={Math.round((stats.error / stats.total) * 100)} variant="red" striped />
            <div className="grid grid-cols-2 gap-3 pt-1">
              {Object.entries(stats).map(([key, val]) => (
                <div key={key} className="p-3 rounded-md bg-surface-layer border border-border-subtle">
                  <p className="text-[11px] text-content-helper uppercase tracking-wider font-medium">{key}</p>
                  <p className="text-base font-semibold text-content-primary font-mono mt-0.5">{val}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="flex-1">
          <div className="flex items-center px-5 h-12 border-b border-card-border-inner bg-card-header">
            <h2 className="text-xs font-semibold text-content-primary uppercase tracking-wider">Quick Links</h2>
          </div>
          <div>
            {quickLinks.map((link) => (
              <button key={link.label} onClick={link.onClick} className="flex items-center gap-3 w-full h-12 px-5 border-b border-border-subtle last:border-b-0 hover:bg-surface-hover transition-colors duration-100 group">
                <link.icon size={16} className="text-content-placeholder group-hover:text-brand-primary transition-colors duration-100 shrink-0" />
                <span className="flex-1 text-left text-sm text-content-secondary group-hover:text-brand-primary transition-colors duration-100">{link.label}</span>
                <ArrowRight size={14} className="text-content-disabled group-hover:text-brand-primary transition-colors duration-100" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
