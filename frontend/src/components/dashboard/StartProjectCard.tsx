import { Plus, RotateCcw, Settings2, PenTool, FileInput, LayoutGrid } from 'lucide-react';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';

const quickActions = [
  {
    icon: PenTool,
    title: 'New 2D Sketch',
    description: 'Plane Init.',
  },
  {
    icon: FileInput,
    title: 'Import STEP',
    description: 'Ext. Geometry',
  },
  {
    icon: LayoutGrid,
    title: 'Templates',
    description: 'Pre-validated',
  },
];

export default function StartProjectCard() {
  return (
    <Card>
      <div className="flex">
        {/* Left: Start Project */}
        <div className="flex-1 p-6 border-r border-surface-border">
          <div className="flex items-center gap-2.5 mb-3">
            <Settings2 size={20} className="text-content-primary" />
            <h2 className="text-sm font-bold text-content-primary uppercase tracking-wide">
              Start Project
            </h2>
          </div>
          <p className="text-sm text-content-secondary leading-relaxed mb-6">
            Configure connection parameters, geometry data transfer protocols, and flow triggers.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="primary" size="md" icon={<Plus size={16} />}>
              NEW DESIGN BOARD
            </Button>
            <Button variant="secondary" size="md" icon={<RotateCcw size={14} />}>
              OPEN RECENT
            </Button>
            <span className="text-xs text-content-muted font-mono ml-1">#M_LINK_V4</span>
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
  );
}
