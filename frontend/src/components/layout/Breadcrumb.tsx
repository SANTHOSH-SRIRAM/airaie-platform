import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@utils/cn';

// ---------------------------------------------------------------------------
// Route-to-label mapping
// ---------------------------------------------------------------------------

interface BreadcrumbSegment {
  label: string;
  path: string;
}

const STATIC_ROUTES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/workflows': 'Workflows',
  '/workflow-studio': 'Editor',
  '/workflow-runs': 'Runs',
  '/agents': 'Agents',
  '/agent-studio': 'Studio',
  '/tools': 'Tools',
  '/boards': 'Boards',
  '/boards/create': 'Create',
  '/integrations': 'Integrations',
  '/capabilities': 'Capabilities',
  '/community': 'Community',
  '/parametric': 'Parametric Logic',
};

// Workflows domain parent
const WORKFLOW_PARENT: BreadcrumbSegment = { label: 'Workflows', path: '/workflows' };
// Agents domain parent
const AGENTS_PARENT: BreadcrumbSegment = { label: 'Agents', path: '/agents' };
// Boards domain parent
const BOARDS_PARENT: BreadcrumbSegment = { label: 'Boards', path: '/boards' };

function buildBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [];

  // Dashboard
  if (pathname === '/dashboard') {
    segments.push({ label: 'Dashboard', path: '/dashboard' });
    return segments;
  }

  // Workflows list
  if (pathname === '/workflows') {
    segments.push({ label: 'Workflows', path: '/workflows' });
    return segments;
  }

  // Workflow detail /workflows/:id
  if (pathname.startsWith('/workflows/')) {
    const id = pathname.split('/')[2];
    segments.push(WORKFLOW_PARENT);
    segments.push({ label: id ?? 'Detail', path: pathname });
    return segments;
  }

  // Workflow studio
  if (pathname === '/workflow-studio') {
    segments.push(WORKFLOW_PARENT);
    segments.push({ label: 'Editor', path: '/workflow-studio' });
    return segments;
  }
  if (pathname.startsWith('/workflow-studio/')) {
    segments.push(WORKFLOW_PARENT);
    segments.push({ label: 'Editor', path: pathname });
    return segments;
  }

  // Workflow runs
  if (pathname === '/workflow-runs') {
    segments.push(WORKFLOW_PARENT);
    segments.push({ label: 'Runs', path: '/workflow-runs' });
    return segments;
  }
  if (pathname.startsWith('/workflow-runs/')) {
    const runId = pathname.split('/')[2];
    segments.push(WORKFLOW_PARENT);
    segments.push({ label: 'Runs', path: '/workflow-runs' });
    segments.push({ label: runId ?? 'Run', path: pathname });
    return segments;
  }

  // Agents list
  if (pathname === '/agents') {
    segments.push({ label: 'Agents', path: '/agents' });
    return segments;
  }

  // Agent studio
  if (pathname === '/agent-studio') {
    segments.push(AGENTS_PARENT);
    segments.push({ label: 'Studio', path: '/agent-studio' });
    return segments;
  }
  if (pathname.startsWith('/agent-studio/')) {
    const agentId = pathname.split('/')[2];
    segments.push(AGENTS_PARENT);
    segments.push({ label: agentId ?? 'Agent', path: pathname });
    return segments;
  }

  // Boards list
  if (pathname === '/boards') {
    segments.push({ label: 'Boards', path: '/boards' });
    return segments;
  }

  // Board create
  if (pathname === '/boards/create') {
    segments.push(BOARDS_PARENT);
    segments.push({ label: 'Create', path: '/boards/create' });
    return segments;
  }

  // Board detail /boards/:id
  if (pathname.startsWith('/boards/')) {
    const boardId = pathname.split('/')[2];
    segments.push(BOARDS_PARENT);
    segments.push({ label: boardId ?? 'Board', path: pathname });
    return segments;
  }

  // Tools
  if (pathname === '/tools') {
    segments.push({ label: 'Tools', path: '/tools' });
    return segments;
  }

  // Fallback: use static route label or path segment
  const staticLabel = STATIC_ROUTES[pathname];
  if (staticLabel) {
    segments.push({ label: staticLabel, path: pathname });
  } else {
    // Generic fallback
    const parts = pathname.split('/').filter(Boolean);
    let currentPath = '';
    for (const part of parts) {
      currentPath += `/${part}`;
      const label = STATIC_ROUTES[currentPath] ?? part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      segments.push({ label, path: currentPath });
    }
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Breadcrumb() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const segments = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  if (segments.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-[12px] shrink-0 px-1"
    >
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;

        return (
          <div key={segment.path} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight size={12} className="text-[#d0d0d0] shrink-0" />
            )}
            {isLast ? (
              <span className="text-[#1a1a1a] font-medium truncate max-w-[180px]">
                {segment.label}
              </span>
            ) : (
              <button
                onClick={() => navigate(segment.path)}
                className={cn(
                  'text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors truncate max-w-[180px]'
                )}
              >
                {segment.label}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
