import Badge from '@components/ui/Badge';
import Card from '@components/ui/Card';
import ProgressBar from '@components/ui/ProgressBar';

export default function SystemLoadCard() {
  return (
    <Card variant="elevated" className="flex-1">
      <div className="flex items-center justify-between px-5 h-12 border-b border-card-border-inner bg-card-header">
        <h2 className="text-xs font-semibold text-content-primary uppercase tracking-wider">System Load</h2>
        <Badge variant="success" badgeStyle="outline">HEALTHY</Badge>
      </div>
      <div className="px-5 py-5 space-y-5">
        <ProgressBar label="Compute Nodes" value={84} variant="blue" striped />
        <ProgressBar label="Storage Volume" value={42} variant="blue" striped />
        <div className="grid grid-cols-2 gap-5 pt-1">
          <div className="p-3 rounded-md bg-surface-layer border border-border-subtle">
            <p className="text-[11px] text-content-helper uppercase tracking-wider font-medium">Memory</p>
            <p className="text-base font-semibold text-content-primary font-mono mt-1">64/128 GB</p>
          </div>
          <div className="p-3 rounded-md bg-surface-layer border border-border-subtle">
            <p className="text-[11px] text-content-helper uppercase tracking-wider font-medium">GPU Temp</p>
            <p className="text-base font-semibold text-content-primary font-mono mt-1">62°C</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
