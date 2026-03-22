import { Plus, RotateCcw, Settings2, PenTool, FileInput, LayoutGrid } from 'lucide-react';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';

const quickActions = [
  { icon: PenTool, title: 'New 2D Sketch', description: 'Plane Init.' },
  { icon: FileInput, title: 'Import STEP', description: 'Ext. Geometry' },
  { icon: LayoutGrid, title: 'Templates', description: 'Pre-validated' },
];

export default function StartProjectCard() {
  return (
    <Card variant="accent">
      <div className="flex items-center gap-2.5 px-5 h-12 border-b border-card-border-inner bg-card-header">
        <Settings2 size={16} className="text-brand-primary" />
        <h2 className="text-xs font-semibold text-content-primary uppercase tracking-wider">Start Project</h2>
        <div className="flex-1" />
        <span className="text-[11px] text-content-helper uppercase tracking-wider font-medium">Quick Actions</span>
      </div>
      <div className="flex">
        <div className="flex-1 px-5 py-6 border-r border-card-border-inner">
          <p className="text-sm text-content-secondary leading-relaxed mb-6">
            Configure connection parameters, geometry data transfer protocols, and flow triggers.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="primary" size="md" icon={<Plus size={16} />}>NEW DESIGN BOARD</Button>
            <Button variant="tertiary" size="md" icon={<RotateCcw size={14} />}>OPEN RECENT</Button>
            <span className="text-xs text-content-placeholder font-mono ml-1">#M_LINK_V4</span>
          </div>
        </div>
        <div className="w-[380px] px-5 py-6">
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
  );
}
