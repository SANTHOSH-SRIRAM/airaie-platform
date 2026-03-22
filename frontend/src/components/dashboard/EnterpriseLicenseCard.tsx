import { Lock, ArrowRight } from 'lucide-react';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';

export default function EnterpriseLicenseCard() {
  return (
    <Card variant="elevated" className="flex-1">
      <div className="flex items-center gap-2 px-5 h-12 border-b border-card-border-inner bg-card-header">
        <Lock size={14} className="text-brand-primary" />
        <h2 className="text-xs font-semibold text-content-primary uppercase tracking-wider">Enterprise License</h2>
      </div>
      <div className="px-5 py-5 space-y-4">
        <p className="text-sm text-content-secondary leading-relaxed">
          Advanced FEA simulation tools and generative design modules are active.
        </p>
        <div className="flex items-center justify-between p-3 rounded-md bg-surface-layer border border-border-subtle">
          <div>
            <p className="text-[11px] text-content-helper uppercase tracking-wider font-medium">Expires</p>
            <p className="text-sm font-semibold text-content-primary mt-0.5">Dec 31, 2024</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-status-success-bg flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-status-success" />
          </div>
        </div>
        <Button variant="tertiary" size="md" className="w-full" iconRight={<ArrowRight size={14} />}>
          Manage License Keys
        </Button>
      </div>
    </Card>
  );
}
