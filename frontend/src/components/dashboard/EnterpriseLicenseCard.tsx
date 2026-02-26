import { Lock } from 'lucide-react';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';

export default function EnterpriseLicenseCard() {
  return (
    <Card className="flex-1 relative overflow-hidden">
      {/* Watermark circle decoration */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full border-[14px] border-gray-100/60 pointer-events-none" />

      <div className="flex items-center gap-2.5 px-5 py-4">
        <Lock size={16} className="text-status-warning" />
        <h2 className="text-xs font-bold text-content-primary uppercase tracking-wider">
          Enterprise License
        </h2>
      </div>
      <div className="px-5 pb-5 space-y-4 relative">
        <p className="text-sm text-content-secondary leading-relaxed">
          Advanced FEA simulation tools and generative design modules are active.
        </p>
        <p className="text-sm text-content-secondary">
          Expires: <span className="text-content-primary font-medium">Dec 31, 2024</span>
        </p>
        <Button variant="secondary" size="md" className="w-full">
          Manage License Keys
        </Button>
      </div>
    </Card>
  );
}
