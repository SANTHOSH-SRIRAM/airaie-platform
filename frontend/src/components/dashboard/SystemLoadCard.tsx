import Badge from '@components/ui/Badge';
import Card from '@components/ui/Card';
import ProgressBar from '@components/ui/ProgressBar';

export default function SystemLoadCard() {
  return (
    <Card className="flex-1">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-xs font-bold text-content-primary uppercase tracking-wider">
          System Load
        </h2>
        <Badge variant="success" badgeStyle="outline">HEALTHY</Badge>
      </div>
      <div className="px-5 pb-5 space-y-5">
        <ProgressBar label="Compute Nodes" value={84} striped />
        <ProgressBar label="Storage Volume" value={42} striped />
        <div className="grid grid-cols-2 gap-4 pt-3">
          <div>
            <p className="text-[10px] text-content-tertiary uppercase tracking-widest font-medium">
              Memory
            </p>
            <p className="text-sm font-semibold text-content-primary font-mono mt-1">64/128 GB</p>
          </div>
          <div>
            <p className="text-[10px] text-content-tertiary uppercase tracking-widest font-medium">
              GPU Temp
            </p>
            <p className="text-sm font-semibold text-content-primary font-mono mt-1">62°C</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
