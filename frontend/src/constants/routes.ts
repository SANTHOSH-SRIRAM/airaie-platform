/**
 * Application routes
 */
export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Protected routes
  DASHBOARD: '/dashboard',
  CAD_STUDIO: '/cad-studio',
  PROJECTS: '/projects',
  PROJECT_DETAIL: '/projects/:id',
  WORKFLOWS: '/workflows',
  WORKFLOW_DETAIL: '/workflows/:id',
  WORKFLOW_EVAL: '/workflows/:workflowId/eval',
  AGENTS: '/agents',
  TOOLS: '/tools',
  ARTIFACTS: '/artifacts',
  APPROVALS: '/approvals',
  TOOL_DETAIL: '/tools/:id',
  AGENT_DETAIL: '/agents/:id',
  TEMPLATES: '/templates',
  SETTINGS: '/settings',
  PROFILE: '/profile',

  // Community
  COMMUNITY: '/community',

  // Embedded studio routes
  BOARDS: '/boards',
  RELEASE_PACKET: '/boards/:id/release',
  WORKFLOW_STUDIO: '/workflow-studio',
  AGENT_STUDIO: '/agent-studio',
} as const;

/** Top navigation page tabs — order matches tab bar left-to-right */
export const PAGE_TABS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, matchPrefix: '/dashboard' },
  { label: 'Workflows', path: ROUTES.WORKFLOWS, matchPrefix: '/workflow' },
  { label: 'Agents', path: ROUTES.AGENTS, matchPrefix: '/agent' },
  { label: 'Tools', path: ROUTES.TOOLS, matchPrefix: '/tools' },
  { label: 'Boards', path: ROUTES.BOARDS, matchPrefix: '/boards' },
  { label: 'Artifacts', path: ROUTES.ARTIFACTS, matchPrefix: '/artifacts' },
  { label: 'Approvals', path: ROUTES.APPROVALS, matchPrefix: '/approvals' },
] as const;

/** Map route prefixes to sidebar content types */
export const ROUTE_SIDEBAR_MAP: Record<string, 'navigation' | 'nodePalette' | 'sessions' | 'filters' | 'artifacts' | 'profile' | 'tool-detail'> = {
  '/dashboard': 'navigation',
  '/workflow-studio': 'nodePalette',
  '/agent-studio': 'sessions',
  '/tools/': 'tool-detail',
  '/tools': 'navigation',
  '/boards/:id/release': 'navigation',
  '/boards': 'navigation',
  '/workflows': 'navigation',
  '/agents': 'navigation',
  '/artifacts': 'artifacts',
  '/approvals': 'navigation',
  '/profile': 'profile',
};

/**
 * Generate route with parameters
 */
export function generateRoute(
  route: string,
  params: Record<string, string>
): string {
  let result = route;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, value);
  }
  return result;
}
