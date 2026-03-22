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
    <div className="flex items-center gap-1.5 text-sm shrink-0">
      <span className="text-cds-text-secondary hover:text-cds-text-primary cursor-pointer transition-colors duration-100">
        {org}
      </span>
      <span className="text-gray-30">/</span>
      <span className="text-cds-text-primary font-medium">{project}</span>
      {studioLabel && (
        <>
          <span className="text-gray-30">/</span>
          <span className="text-brand-primary font-medium">{studioLabel}</span>
        </>
      )}
    </div>
  );
}
