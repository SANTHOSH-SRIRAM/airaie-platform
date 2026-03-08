import { LayoutGrid } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface BreadcrumbProps {
  org?: string;
  project?: string;
}

const STUDIO_LABELS: Record<string, string> = {
  '/boards': 'Board Studio',
  '/workflow-studio': 'Workflow Studio',
  '/agent-studio': 'Agent Studio',
};

function useStudioLabel(): string | undefined {
  const { pathname } = useLocation();
  for (const [prefix, label] of Object.entries(STUDIO_LABELS)) {
    if (pathname.startsWith(prefix)) return label;
  }
  return undefined;
}

export default function Breadcrumb({ org = 'ABCworld', project = 'ENGINEERING' }: BreadcrumbProps) {
  const studioLabel = useStudioLabel();

  return (
    <div className="flex items-center gap-2 text-sm shrink-0">
      <LayoutGrid size={16} className="text-content-tertiary" />
      <span className="font-medium text-content-primary">{org}</span>
      <span className="text-content-muted">/</span>
      <span className="font-medium text-brand-secondary">{project}</span>
      {studioLabel && (
        <>
          <span className="text-content-muted">/</span>
          <span className="font-medium text-content-primary">{studioLabel}</span>
        </>
      )}
    </div>
  );
}
