import { LayoutGrid } from 'lucide-react';

interface BreadcrumbProps {
  org?: string;
  project?: string;
}

export default function Breadcrumb({ org = 'ABCworld', project = 'ENGINEERING' }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-sm shrink-0">
      <LayoutGrid size={16} className="text-content-tertiary" />
      <span className="font-medium text-content-primary">{org}</span>
      <span className="text-content-muted">/</span>
      <span className="font-medium text-brand-secondary">{project}</span>
    </div>
  );
}
