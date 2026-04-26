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
  CARD_DETAIL: '/cards/:cardId',
  RELEASE_PACKET: '/boards/:id/release',
  WORKFLOW_STUDIO: '/workflow-studio',
  AGENT_STUDIO: '/agent-studio',

  // Admin (TODO(Phase F): gate behind admin role)
  ADMIN_LLM_PROVIDERS: '/admin/llm-providers',
  ADMIN_AUDIT: '/admin/audit',
  ADMIN_COST: '/admin/cost',
} as const;

/** Top navigation page tabs — order matches tab bar left-to-right.
 *  Order follows the user journey, not the dependency graph:
 *    1. Dashboard — situational awareness, always-home
 *    2. Workflows — the primary verb (do the work)
 *    3. Boards    — execute → govern progression (govern the work)
 *    4. Agents    — intelligence layer used inside workflows
 *    5. Tools     — infrastructure / catalog
 *    6. Artifacts — data trail, rarely an entry point
 *  Approvals is intentionally NOT a top-level tab — it's an inbox surface
 *  exposed via the bell icon and inside Boards detail. */
export const PAGE_TABS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, matchPrefix: '/dashboard' },
  { label: 'Workflows', path: ROUTES.WORKFLOWS, matchPrefix: '/workflow' },
  { label: 'Boards', path: ROUTES.BOARDS, matchPrefix: '/boards' },
  { label: 'Agents', path: ROUTES.AGENTS, matchPrefix: '/agent' },
  { label: 'Tools', path: ROUTES.TOOLS, matchPrefix: '/tools' },
  { label: 'Artifacts', path: ROUTES.ARTIFACTS, matchPrefix: '/artifacts' },
] as const;

/** Map route prefixes to sidebar content types */
export const ROUTE_SIDEBAR_MAP: Record<string, 'navigation' | 'nodePalette' | 'sessions' | 'filters' | 'artifacts' | 'profile' | 'tool-detail' | 'card-detail'> = {
  '/dashboard': 'navigation',
  '/workflow-studio': 'nodePalette',
  '/agent-studio': 'sessions',
  '/tools/': 'tool-detail',
  '/tools': 'navigation',
  '/cards': 'card-detail',
  '/boards/:id/release': 'navigation',
  '/boards': 'navigation',
  '/workflows': 'navigation',
  '/agents': 'navigation',
  '/artifacts': 'artifacts',
  '/approvals': 'navigation',
  '/profile': 'profile',
};

/**
 * Per-card detail page path (Phase 8 Card-as-page).
 * Replaces the BoardDetailPage Cards-tab side-sheet with `/cards/:cardId`.
 * Side-sheet remains available behind `?legacy=1` on the Board route for one release.
 */
export const cardDetailPath = (id: string) => `/cards/${id}`;

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
